# Kubernetes Backend Setup (Node.js)

## Overview

This document explains how to deploy the Node.js backend application into Kubernetes.

Backend components:

1. Backend Docker Image
2. Backend Deployment
3. Backend Service
4. Environment Configuration
5. Database Connection Verification


---

# Architecture

```
              Frontend Pods

                    |
                    |

            backend-service

                    |
                    |

             Backend Pods

                    |
                    |

             mysql-service

                    |
                    |

             MySQL Database
```

---

# Prerequisites

Before deploying backend:

Check Kubernetes cluster:

```bash
kubectl get nodes
```

Expected:

```
NAME       STATUS
master     Ready
worker1    Ready
```

Verify database service:

```bash
kubectl get svc
```

Expected:

```
mysql-service
```

---

# Step 1: Build Backend Docker Image

Go to backend project:

```bash
cd backend
```

Build image:

```bash
docker build -t todo-backend:v1 .
```

Explanation:

Docker creates an image containing:

- Node.js runtime
- Application code
- Dependencies


Check image:

```bash
docker images
```

Expected:

```
todo-backend
v1
```

---

# Step 2: Push Image To Registry

Login:

```bash
docker login
```

Tag image:

```bash
docker tag todo-backend:v1 username/todo-backend:v1
```

Push:

```bash
docker push username/todo-backend:v1
```

Kubernetes worker nodes download this image.

---

# Step 3: Create Backend Deployment

## File

```
backend-deployment.yaml
```

Deployment creates:

- Backend pods
- Replica management
- Container configuration
- Environment variables


---

Apply:

```bash
kubectl apply -f backend-deployment.yaml
```

---

# Step 4: Check Backend Deployment

Command:

```bash
kubectl get deployment
```

Expected:

```
NAME
backend
```

---

Check pods:

```bash
kubectl get pods
```

Expected:

```
backend-xxxxx    Running
```

---

# Step 5: Backend Environment Configuration

Backend requires:

```
DB_HOST=mysql-service
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root1234
DB_NAME=todo_db
```

Connection:

```
Backend Pod

     |

     |

mysql-service:3306

     |

     |

MySQL Pod
```

---

# Step 6: Create Backend Service

## File

```
backend-service.yaml
```

Service type:

```
ClusterIP
```

Reason:

Backend does not need public access.

Only frontend needs backend access.

---

Apply:

```bash
kubectl apply -f backend-service.yaml
```

---

Check:

```bash
kubectl get svc
```

Expected:

```
backend-service

ClusterIP
```

---

# Step 7: Verify Backend API

Check backend pod:

```bash
kubectl get pods
```

Get logs:

```bash
kubectl logs deployment/backend
```

Expected:

```
Server running on port 4000

Database connected successfully
```

---

# Step 8: Test Backend Service

Enter frontend or temporary pod:

```bash
kubectl run test \
--image=curlimages/curl \
-it --rm \
-- sh
```

Inside:

```bash
curl backend-service:4000
```

Expected:

```
API response
```

---

# Troubleshooting

## Pod not starting

Check:

```bash
kubectl describe pod <pod-name>
```

---

## Application crash

Check:

```bash
kubectl logs deployment/backend
```

---

## Database connection error

Check:

```bash
kubectl get svc mysql-service
```

Check DNS:

```bash
nslookup mysql-service
```

---












# Kubernetes Frontend Setup (Nginx)

## Overview

This document explains how to deploy the React/HTML frontend application using Nginx.

Frontend components:

1. Frontend Docker Image
2. Frontend Deployment
3. Frontend Service
4. External Access


---

# Architecture

```
              User

               |

               |

        frontend-service

               |

               |

        Frontend Pods

               |

               |

        Backend Service
```

---

# Step 1: Build Frontend Image

Go to frontend folder:

```bash
cd frontend
```

Build:

```bash
docker build -t todo-frontend:v1 .
```

---

Check:

```bash
docker images
```

Expected:

```
todo-frontend
v1
```

---

# Step 2: Push Image

Login:

```bash
docker login
```

Tag:

```bash
docker tag todo-frontend:v1 username/todo-frontend:v1
```

Push:

```bash
docker push username/todo-frontend:v1
```

---
## 2.1 Create `frontend-config.yaml`

We need to replace url in frontend to connect the backend to frontend

Create a file named `frontend-config.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: todo-app

data:
  configs.js: |
    const API = "http://<NodePort IP>:<Port>";
```

## Apply the ConfigMap

```bash
kubectl apply -f frontend-config.yaml
```
---

# Step 3: Create Frontend Deployment

## File

```
frontend-deployment.yaml
```

Deployment creates:

- Nginx container
- Frontend pods
- Replica management


Apply:

```bash
kubectl apply -f frontend-deployment.yaml
```

---

# Step 4: Verify Frontend Pods

Command:

```bash
kubectl get pods
```

Expected:

```
frontend-xxxxx Running
```

---

# Step 5: Create Frontend Service

## File

```
frontend-service.yaml
```

For EC2 testing:

Use:

```
NodePort
```

For production:

Use:

```
LoadBalancer
```

---

Apply:

```bash
kubectl apply -f frontend-service.yaml
```

---

# Step 6: Check Frontend Service

Command:

```bash
kubectl get svc
```

Example:

```
frontend-service

NodePort

80:30080
```

---

# Step 7: Access Application

Find EC2 public IP:

AWS Console

or:

```bash
curl ifconfig.me
```

Open:

```
http://EC2_PUBLIC_IP:30080
```

---

# Step 8: Check Frontend Logs

Command:

```bash
kubectl logs deployment/frontend
```

---

# Troubleshooting

## Nginx not running

Check:

```bash
kubectl describe pod <frontend-pod>
```

---

## Service not accessible

Check:

```bash
kubectl get svc
```

Check NodePort:

```bash
kubectl get nodes -o wide
```

Verify AWS Security Group allows:

```
TCP NodePort
```

---

# Cleanup frontend

```bash
kubectl delete -f frontend-service.yaml

kubectl delete -f frontend-deployment.yaml
```
# Cleanup backend

```bash
kubectl delete -f backend-service.yaml

kubectl delete -f backend-deployment.yaml
```
