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

# add github host key(s)
RUN mkdir -p /home/repowax/.ssh
RUN ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
RUN ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts

# tell the service to run on standard port, but allow to be overridden using environment variable
ENV PORT=3001
EXPOSE 3001/tcp

# by default, tell the service to kick out only log.info, not all debugging information
# ENV DEBUG="*"
# ENV DEBUG_COLORS="false"

# run as non-root user
CMD [ "./repowax-linux" ]
