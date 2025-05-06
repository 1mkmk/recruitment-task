FROM gradle:7.4.2-jdk17

WORKDIR /app

# Copy gradle configuration files
COPY build.gradle.kts settings.gradle.kts ./

# Create directories for source code
RUN mkdir -p src/main/kotlin

# Copy source code
COPY src ./src

# Expose the port the app runs on
EXPOSE 8080

# Set default environment variable
ENV APP_ENV=dev
ENV APP_MODE=api

# Command to run the application
CMD ["./gradlew", "runDevApi"] 