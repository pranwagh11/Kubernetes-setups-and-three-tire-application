# Kubernetes Cluster Setup Using kubeadm on AWS EC2

This guide explains how to create a Kubernetes cluster on AWS EC2 using kubeadm.

## Architecture

- 1 EC2 instance as Kubernetes Control Plane (Master)
- 1 or more EC2 instances as Worker Nodes
- Ubuntu 22.04/24.04
- Container runtime: containerd

Example:

```
                 +----------------+
                 |  Control Plane |
                 |   EC2 Master   |
                 +----------------+
                         |
                         |
        --------------------------------
        |                              |
+---------------+              +---------------+
| Worker Node 1 |              | Worker Node 2 |
|    EC2        |              |    EC2        |
+---------------+              +---------------+
```

---

# 1. Create AWS EC2 Instances

## Recommended Instance Size

| Role | Instance Type | OS |
|---|---|---|
| Control Plane | t3.medium or higher | Ubuntu 22.04 |
| Worker Node | t3.medium or higher | Ubuntu 22.04 |

Minimum requirements:

- 2 CPU
- 4 GB RAM
- 20 GB storage

---

# 2. Configure Security Group

Allow the following ports:

| Port | Purpose |
|---|---|
| 22 | SSH |
| 6443 | Kubernetes API Server |
| 2379-2380 | etcd |
| 10250 | kubelet |
| 10257 | Controller Manager |
| 10259 | Scheduler |
| 30000-32767 | NodePort Services |

Allow communication between Kubernetes nodes using the same Security Group.

---
# Kubernetes AWS EC2 Security Group Ports

## Control Plane Security Group

### Inbound Rules

| Purpose | Protocol | Port | Source |
|---|---|---|---|
| SSH | TCP | 22 | Your IP |
| Kubernetes API Server | TCP | 6443 | Worker Security Group + Admin IP |
| etcd | TCP | 2379-2380 | Control Plane Security Group |
| kubelet | TCP | 10250 | Control Plane Security Group |
| Controller Manager | TCP | 10257 | Control Plane Security Group |
| Scheduler | TCP | 10259 | Control Plane Security Group |
| NodePort Services | TCP | 30000-32767 | Required Users |

---

# Worker Security Group

## Inbound Rules

| Purpose | Protocol | Port | Source |
|---|---|---|---|
| SSH | TCP | 22 | Your IP |
| kubelet | TCP | 10250 | Control Plane Security Group |
| Calico Networking | UDP | 8472 | Worker Security Group |
| NodePort Services | TCP | 30000-32767 | Required Users |
---

# 3. Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<public-ip>
```

Run on all nodes:

```bash
sudo apt update
sudo apt upgrade -y
```

---

# 4. Disable Swap

Run on all nodes:

```bash
sudo swapoff -a

sudo sed -i '/swap/d' /etc/fstab
```

---

# 5. Configure Kernel Modules

Run on all nodes:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

Load modules:

```bash
sudo modprobe overlay
sudo modprobe br_netfilter
```

Enable networking:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
```

Apply settings:

```bash
sudo sysctl --system
```

---

# 6. Install containerd

Run on all nodes:

```bash
sudo apt install -y containerd
```

Create configuration:

```bash
sudo mkdir -p /etc/containerd

containerd config default | sudo tee /etc/containerd/config.toml
```

Enable systemd cgroup:

```bash
sudo sed -i \
's/SystemdCgroup = false/SystemdCgroup = true/' \
/etc/containerd/config.toml
```

Restart containerd:

```bash
sudo systemctl restart containerd

sudo systemctl enable containerd
```

Verify:

```bash
systemctl status containerd
```

---

# 7. Install Kubernetes Packages

Run on all nodes.

Add Kubernetes repository:

```bash
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key \
| sudo gpg --dearmor \
-o /etc/apt/keyrings/kubernetes.gpg
```

Add repository:

```bash
echo "deb [signed-by=/etc/apt/keyrings/kubernetes.gpg] \
https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" \
| sudo tee /etc/apt/sources.list.d/kubernetes.list
```

Install Kubernetes:

```bash
sudo apt update

sudo apt install -y kubelet kubeadm kubectl
```

Prevent automatic upgrades:

```bash
sudo apt-mark hold kubelet kubeadm kubectl
```

Enable kubelet:

```bash
sudo systemctl enable kubelet
```

---

# 8. Initialize Kubernetes Control Plane

Run only on the master node.

Find private IP:

```bash
hostname -I
```

Initialize cluster:

```bash
sudo kubeadm init \
--apiserver-advertise-address=<MASTER_PRIVATE_IP> \
--pod-network-cidr=192.168.0.0/16
```

Example:

```bash
sudo kubeadm init \
--apiserver-advertise-address=10.0.1.10 \
--pod-network-cidr=192.168.0.0/16
```

Save the generated worker join command:

Example:

```bash
kubeadm join 10.0.1.10:6443 \
--token xxxxxx \
--discovery-token-ca-cert-hash sha256:xxxxxx
```

---

# 9. Configure kubectl

Run on the master node:

```bash
mkdir -p $HOME/.kube
```

Copy Kubernetes configuration:

```bash
sudo cp /etc/kubernetes/admin.conf \
$HOME/.kube/config
```

Change ownership:

```bash
sudo chown $(id -u):$(id -g) \
$HOME/.kube/config
```

Verify:

```bash
kubectl get nodes
```

Expected:

```
NAME          STATUS
master        NotReady
```

---

# 10. Install Calico Network Plugin

Run on master:

```bash
kubectl apply -f \
https://raw.githubusercontent.com/projectcalico/calico/v3.27.3/manifests/calico.yaml
```

Check pods:

```bash
kubectl get pods -n kube-system
```

Check nodes:

```bash
kubectl get nodes
```

Expected:

```
NAME          STATUS   ROLE
master        Ready    control-plane
```

---

# 11. Join Worker Nodes

SSH into each worker node.

Run the join command generated earlier:

Example:

```bash
sudo kubeadm join 10.0.1.10:6443 \
--token abcdef.123456789 \
--discovery-token-ca-cert-hash sha256:xxxxxxxx
```

---

# 12. Verify Cluster

On master:

```bash
kubectl get nodes
```

Example output:

```
NAME          STATUS   ROLE
master        Ready    control-plane
worker1       Ready    <none>
worker2       Ready    <none>
```

Check system pods:

```bash
kubectl get pods -A
```

---

# 13. Deploy Test Application

Create nginx deployment:

```bash
kubectl create deployment nginx \
--image=nginx
```

Expose service:

```bash
kubectl expose deployment nginx \
--type=NodePort \
--port=80
```

Check service:

```bash
kubectl get svc
```

Access:

```
http://<worker-public-ip>:<node-port>
```

---

# Production Recommendations

For production Kubernetes on AWS:

- Use 3 control-plane nodes for HA
- Use private EC2 subnets
- Use AWS Load Balancer for API server
- Install AWS EBS CSI Driver
- Install Metrics Server
- Install Ingress Controller
- Install cert-manager
- Configure Cluster Autoscaler
- Use IAM roles instead of static credentials

---

# Useful Commands

## Cluster status

```bash
kubectl get nodes
```

## All resources

```bash
kubectl get all -A
```

## Kubernetes version

```bash
kubectl version
```

## Remove node

```bash
kubectl delete node <node-name>
```

## Reset node

```bash
sudo kubeadm reset -f
```