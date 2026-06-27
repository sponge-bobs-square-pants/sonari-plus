.PHONY: build run push deploy build-deploy clean logs stop shell

# Variables
IMAGE_NAME = nuit_frontend
CONTAINER_NAME = nuit_frontend_container
OLD_TAG = v0.0.5
TAG = v0.0.6
DOCKER_HUB_USERNAME = nuitdotin
REMOTE_HOST = root@143.110.184.135
PORT = 8080
VITE_API_URL = https://backend.nuit.in/api

# Build the Docker image (API URL is baked in at build time)
build:
	docker build --platform linux/amd64 --build-arg VITE_API_URL=$(VITE_API_URL) -t $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG) .

# Run the container locally for testing
run:
	docker run --name $(CONTAINER_NAME) \
		-p $(PORT):80 \
		-d $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG)

# Stop the container
stop:
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

# Push the image to Docker Hub
push:
	docker push $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG)

# Clean up Docker resources
clean: stop
	docker rmi $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG) || true

# View container logs
logs:
	docker logs -f $(CONTAINER_NAME)

# SSH into the container
shell:
	docker exec -it $(CONTAINER_NAME) /bin/sh

# Deploy to remote server via SSH (bound to localhost; nginx proxies it)
deploy:
	@echo "Deploying $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG) to $(REMOTE_HOST)..."
	ssh $(REMOTE_HOST) "\
		docker stop $(CONTAINER_NAME) || true; \
		docker rm $(CONTAINER_NAME) || true; \
		docker rmi -f $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(OLD_TAG) || true; \
		docker pull $(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG); \
		docker run -d \
			--name $(CONTAINER_NAME) \
			-p 127.0.0.1:$(PORT):80 \
			--restart unless-stopped \
			$(DOCKER_HUB_USERNAME)/$(IMAGE_NAME):$(TAG); \
		docker ps | grep $(CONTAINER_NAME) \
	"

# Complete build, push and deploy workflow
build-deploy: build push deploy
	@echo "Complete deployment workflow finished!"
