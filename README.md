# Card Manager

Local Minikube + DevSpace setup with two pods:

- `card-manager-app`: Node.js, Express, Vue
- `card-manager-db`: PostgreSQL

## Requirements

- Docker
- Minikube
- kubectl
- DevSpace

## Run

From the project root:

```sh
minikube start
devspace dev
```

## Access

Site:

```text
http://localhost:5173
```

API health:

```text
http://localhost:3000/api/health
```

Kubernetes dashboard:

```sh
minikube dashboard
```

DevSpace UI:

```sh
devspace dev --show-ui
```

PostgreSQL:

```text
postgres://postgres:postgres@localhost:5432/card_manager
```

## Stop

Stop DevSpace with `Ctrl+C`.

Remove Kubernetes resources:

```sh
devspace purge
```

Stop Minikube:

```sh
minikube stop
```
