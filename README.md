
# StudentBook

StudentBook is a social platform API for students to interact, share posts, comment, like, and follow each other. This project is built using Node.js and MongoDB.

## Features

- User management: create users, follow/unfollow users.
- Post management: create posts, like posts, view all posts.
- Commenting system: add comments to posts, view comments.
- Fully containerized with Docker.

## Requirements

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).
- GitHub Personal Access Token (PAT) to authenticate with GitHub Container Registry.

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Dredro/StudentBook.git
cd StudentBook
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory to define environment variables:

```plaintext
MONGO_URI=mongodb://mongo:27017/socialApp
PORT=5000
```

### 3. Run with Docker Compose

Use the provided `docker-compose.yml` file to set up the application.

#### Example `docker-compose.yml`
```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/dredro/studentbook:latest
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/socialApp
    depends_on:
      - mongo

  mongo:
    image: mongo:6.0
    container_name: mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
    driver: local
```

### 4. Build and Start the Application

If you haven't already pushed the prebuilt Docker image to GitHub Container Registry, you can build it locally:

```bash
docker-compose up --build
```

To use the prebuilt image from GitHub Container Registry:

```bash
docker-compose up -d
```

### 5. Access the Application

- The API will be available at [http://localhost:5000](http://localhost:5000).
- Swagger documentation: [http://localhost:5000/api-docs](http://localhost:5000/api-docs).

### 6. Stop the Application

To stop and remove all running containers:

```bash
docker-compose down
```

## Development

To make changes to the application:
1. Modify the source code.
2. Rebuild the Docker image:
   ```bash
   docker-compose up --build
   ```

## Deployment

To deploy using GitHub Container Registry:
1. Build the Docker image:
   ```bash
   docker build -t ghcr.io/dredro/studentbook:latest .
   ```
2. Push the image to GitHub:
   ```bash
   docker push ghcr.io/dredro/studentbook:latest
   ```

## License

This project is licensed under the MIT License.

---

