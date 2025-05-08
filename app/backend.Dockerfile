# Stage 1: Build the application
FROM gradle:7.4.2-jdk17 AS builder

WORKDIR /app

# Copy gradle files for dependency resolution and caching
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
COPY gradlew ./

# Make the gradlew script executable
RUN chmod +x ./gradlew

# Download dependencies first (this layer will be cached if dependencies don't change)
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src ./src

# Build the application
RUN ./gradlew build --no-daemon -x test

# Stage 2: Setup the runtime environment
FROM openjdk:17-slim

WORKDIR /app

# Create non-root user to run the application
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create directories for application data
RUN mkdir -p /app/posts && \
    chown -R appuser:appuser /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/build/libs/*.jar /app/app.jar

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8080

# Environment variables
ENV APP_ENV=production
ENV APP_MODE=api

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/api/info || exit 1

# Set entry point
ENTRYPOINT ["java", "-jar", "/app/app.jar"]