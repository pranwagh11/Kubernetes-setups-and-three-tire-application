# Kubernetes MySQL Database Setup

## Overview

This document explains how to deploy MySQL inside Kubernetes for the Todo application.

Components created:

1. MySQL Secret
2. Persistent Storage (PVC)
3. MySQL Deployment
4. MySQL Service
5. Database Verification
6. Backend Connection Testing

---

# Architecture

```
                 Frontend
                    |
                    |
          frontend-service
                    |
                    |
              Backend Pods
                    |
                    |
          backend-service
                    |
                    |
           mysql-service
                    |
                    |
             MySQL Pod
                    |
                    |
          Persistent Volume
```

---

# Prerequisites

Before starting, make sure:

- Kubernetes cluster is running
- kubectl is configured
- Backend deployment exists
- Backend uses:

```
DB_HOST=mysql-service
DB_PORT=3306
```

Check cluster:

```bash
kubectl get nodes
```

Expected:

```
NAME          STATUS
master        Ready
worker1       Ready
```

---
## Create a PersistentVolume (PV)

Create a file named `mysql-pv.yaml` with the following content:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv
spec:
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /mnt/mysql-data
```

### Create the storage directory on the node

```bash
sudo mkdir -p /mnt/mysql-data
sudo chmod 777 /mnt/mysql-data
```

### Apply the PersistentVolume

```bash
kubectl apply -f mysql-pv.yaml
```

### Verify the PersistentVolume

```bash
kubectl get pv
```

---

# Step 1: Create Database Namespace (Optional)

## Create namespace

Command:

```bash
kubectl create namespace todo-app
```

## Explanation

Namespace separates application resources.

Example:

```
default namespace

        |
        |
todo-app namespace

        |
        |
MySQL
Backend
Frontend
```

Check:

```bash
kubectl get namespaces
```

---

# Step 2: Create MySQL Secret

## File

Create:

```
mysql-secret.yaml
```

This file contains:

- MySQL root password
- Database credentials

---

## Apply Secret

Command:

```bash
kubectl apply -f mysql-secret.yaml -n todo-app
```

## Explanation

`kubectl apply`

creates or updates Kubernetes resources.

Syntax:

```
kubectl apply -f <yaml-file>
```

Where:

```
-f
|
|
file location
```

---

## Verify Secret

Command:

```bash
kubectl get secrets -n todo-app
```

Expected:

```
NAME
mysql-secret
```

---

# Step 3: Create Persistent Storage

## File

Create:

```
mysql-pvc.yaml
```

This defines:

- Required storage size
- Access mode
- Storage request

---

## Apply PVC

Command:

```bash
kubectl apply -f mysql-pvc.yaml -n todo-app
```

---

## Check PVC

Command:

```bash
kubectl get pvc -n todo-app
```

Expected:

```
NAME
mysql-pvc

STATUS
Bound
```

---

## Explanation

PVC keeps MySQL data safe.

Without PVC:

```
MySQL Pod deleted

        |

        v

Database lost
```

With PVC:

```
MySQL Pod

        |

        v

Persistent Volume

        |

        v

Database survives
```

---

# Step 4: Deploy MySQL Database

## File

Create:

```
mysql-deployment.yaml
```

This creates:

- MySQL container
- MySQL pod
- Storage mount
- Database configuration

---

## Apply MySQL Deployment

Command:

```bash
kubectl apply -f mysql-deployment.yaml -n todo-app
```

---

## Check Deployment

Command:

```bash
kubectl get deployment -n todo-app
```

Expected:

```
NAME
mysql
```

---

## Check MySQL Pod

Command:

```bash
kubectl get pods -n todo-app
```

Expected:

```
mysql-xxxxx    Running
```

---

# Step 5: Check MySQL Logs

Command:

```bash
kubectl logs deployment/mysql -n todo-app
```

Expected:

```
ready for connections
```

This means:

```
MySQL Server Started
```

---

# Step 6: Create MySQL Service

## File

Create:

```
mysql-service.yaml
```

Service provides:

- Stable IP
- Internal DNS name
- Backend connectivity

---

## Apply Service

Command:

```bash
kubectl apply -f mysql-service.yaml -n todo-app
```

---

## Verify Service

Command:

```bash
kubectl get svc -n todo-app
```

Expected:

```
NAME
mysql-service

TYPE
ClusterIP
```

---

# Step 7: Verify MySQL DNS

Backend will connect using:

```
mysql-service
```

Check DNS:

```bash
kubectl get svc mysql-service -n todo-app
```

Example:

```
NAME
mysql-service

CLUSTER-IP
10.96.50.20
```

Kubernetes DNS:

```
mysql-service.todo-app.svc.cluster.local
```

---

# Step 8: Login Into MySQL Pod

Find pod:

```bash
kubectl get pods -n todo-app
```

Example:

```
mysql-7ddc8c9d8-xxyy
```

Enter pod:

```bash
kubectl exec -it mysql-7ddc8c9d8-xxyy \
-n todo-app -- bash
```

---

# Step 9: Login MySQL

Inside container:

```bash
mysql -uroot -p
```

Enter password:

```
root1234
```

---

# Step 10: Verify Database

Inside MySQL:

```sql
SHOW DATABASES;
```

Expected:

```
todo_db
mysql
information_schema
performance_schema
```

---

# Step 11: Verify Tables

Select database:

```sql
USE todo_db;
```

Show tables:

```sql
SHOW TABLES;
```

Expected:

```
Your application tables
```

---

# Step 12: Deploy Backend

Backend environment should contain:

```
DB_HOST=mysql-service
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root1234
DB_NAME=todo_db
```

Apply backend:

```bash
kubectl apply -f backend-deployment.yaml -n todo-app
```

Apply backend service:

```bash
kubectl apply -f backend-service.yaml -n todo-app
```

---

# Step 13: Verify Backend Connection

Check backend pod:

```bash
kubectl get pods -n todo-app
```

Example:

```
backend-xxxxx Running
```

---

Check backend logs:

```bash
kubectl logs deployment/backend -n todo-app
```

Expected:

```
Database connected successfully
Server running on port 4000
```

---

# Step 14: Complete Application Check

Check all resources:

```bash
kubectl get all -n todo-app
```

Expected:

```
pod/mysql              Running
pod/backend            Running
pod/frontend            Running

service/mysql-service
service/backend-service
service/frontend-service
```

---

# Troubleshooting Commands

## Describe MySQL Pod

```bash
kubectl describe pod <mysql-pod-name> -n todo-app
```

Use when:

- Pod is Pending
- Pod is restarting


---

## MySQL Logs

```bash
kubectl logs deployment/mysql -n todo-app
```

Use when:

- Database does not start


---

## Backend Logs

```bash
kubectl logs deployment/backend -n todo-app
```

Use when:

- Backend cannot connect database


---

## Check Service Endpoints

```bash
kubectl get endpoints -n todo-app
```

Expected:

```
mysql-service
    |
    |
mysql pod IP
```

---

# Final Database Flow

```
Backend Pod

      |
      |
DB_HOST=mysql-service

      |
      |

mysql-service:3306

      |
      |

MySQL Pod

      |
      |

Persistent Volume

      |
      |

Database Data
```

---

# Cleanup

Remove database resources:

```bash
kubectl delete -f mysql-service.yaml -n todo-app

kubectl delete -f mysql-deployment.yaml -n todo-app

kubectl delete -f mysql-pvc.yaml -n todo-app

kubectl delete -f mysql-secret.yaml -n todo-app
```