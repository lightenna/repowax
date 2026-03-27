# generic microservice Dockerfile
# based on latest Ubuntu LTS
FROM ubuntu:latest

ARG SERVICENAME=repowax
ARG USER_ID=1000
ARG GROUP_ID=1000

# install minimal packages to enable run and test
RUN apt-get -qq update && apt-get -qq -y install curl net-tools git

# create app directory
WORKDIR "/app/$SERVICENAME"

# create user and run as that user
RUN echo "Creating repowax:repowax-data (${USER_ID}:${GROUP_ID})"
RUN groupadd -g ${GROUP_ID} repowax-data
RUN useradd -u ${USER_ID} -g ${GROUP_ID} -m -s /bin/bash repowax

# transfer app package
COPY ./dist-prod/repowax-linux .

# give executing user read-only access to executable (and copied dependencies)
RUN chown repowax:repowax-data -R ./ && chmod 0555 -R ./
USER repowax

# add github host keys from https://api.github.com/meta (pinned, not fetched at build time)
RUN mkdir -p /home/repowax/.ssh && \
    echo "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl" >> ~/.ssh/known_hosts && \
    echo "github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=" >> ~/.ssh/known_hosts && \
    echo "github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZKyPIGxRAEaB+2sCsFw0zRDiZbqEFXlbLFBMJPdoCm6WKrFVyALBCAq3H8pV3HaGi8bfQh0f+BObOmRjKwP9OGhZYIdwaYF7q/N6dOqggVF3qb1V+jRl0pGh2EAAQ+3MlhJ+HNR0aN2Eaicf67cG0Oce3JR1y5MkGPuA6I/R35xlbfSTcMxH6RaOF2G4wmfOKnE0DJxS3+oAlPAy/+nBK/0C7FFGY37UxKkwaS/Psr+cGNNxJcC7FHMCV3qDFZAy7SEzEkaC4CzHbqdPn+KNCZ0D5Pdr0cTm2Pci0x0ow+NJOFx0N5GzFP9qRSQrz0PVl/q5bSQ3h2JKpBThfhx4PXKdXmNGJXpOzID3MXNLF9JZO+kp2OAXO+rBSf8Q1o/y2bv8C3lz+m6KKHhFGJKgB1dAXHr5VLFp5OQJ5hB9VDBmTcclcQ9n6M=" >> ~/.ssh/known_hosts

# tell the service to run on standard port, but allow to be overridden using environment variable
ENV PORT=3001
EXPOSE 3001/tcp

# by default, tell the service to kick out only log.info, not all debugging information
# ENV DEBUG="*"
# ENV DEBUG_COLORS="false"

# run as non-root user
CMD [ "./repowax-linux" ]
