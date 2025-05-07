plugins {
    kotlin("jvm") version "1.9.0"
    kotlin("plugin.serialization") version "1.9.0"
    application
}

// Add Java toolchain management
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(11))
    }
}

// Configure toolchain management
tasks.withType<JavaCompile>().configureEach {
    options.release.set(11)
}

group = "net.maciejkasik"
version = "1.0-SNAPSHOT"

val ktor_version = "2.3.1"

repositories {
    mavenCentral()
}

dependencies {
    // Retrofit i HTTP
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("com.squareup.okhttp3:okhttp:4.10.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.10.0")
    
    // Ktor server
    implementation("io.ktor:ktor-server-core:$ktor_version")
    implementation("io.ktor:ktor-server-netty:$ktor_version")
    implementation("io.ktor:ktor-server-content-negotiation:$ktor_version")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktor_version")
    implementation("io.ktor:ktor-server-cors:$ktor_version")
    implementation("io.ktor:ktor-server-status-pages:$ktor_version")
    
    // Kotlinx Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.5.1")
    
    // Logging
    implementation("ch.qos.logback:logback-classic:1.4.7")
    
    // Testy
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.9.3")
    testImplementation("io.mockk:mockk:1.13.5")
    testImplementation("io.ktor:ktor-server-test-host:$ktor_version")
    testImplementation("io.ktor:ktor-client-content-negotiation:$ktor_version")
    testImplementation("io.ktor:ktor-client-mock:$ktor_version")
}

tasks.test {
    useJUnitPlatform()
}

kotlin {
    jvmToolchain(11)
}

application {
    mainClass.set("net.maciejkasik.MainKt")
    
    // Instead of passing args directly, we will use system properties
    applicationDefaultJvmArgs = listOf(
        "-Dapp.env=${project.findProperty("env") ?: "dev"}",
        "-Dapp.mode=${project.findProperty("mode") ?: "cli"}"
    )
}

// Configure jar task to ensure manifest includes main class
tasks.jar {
    manifest {
        attributes(
            mapOf(
                "Main-Class" to "net.maciejkasik.MainKt",
                "Implementation-Title" to project.name,
                "Implementation-Version" to project.version
            )
        )
    }
    
    // This line ensures all dependencies are included in the fat JAR
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
    
    // Avoid duplicate files in the JAR
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

// Configure the existing 'run' task instead of creating a new one
tasks.named<JavaExec>("run") {
    // Get env and mode properties with defaults
    val env = project.findProperty("env") as String? ?: "dev"
    val mode = project.findProperty("mode") as String? ?: "cli"
    
    // Pass as system properties instead of args
    systemProperty("app.env", env)
    systemProperty("app.mode", mode)
}

// Existing tasks for specific environments
tasks.register<JavaExec>("runDevCli") {
    group = "application"
    description = "Runs the application in development environment (CLI mode)"
    mainClass.set("net.maciejkasik.MainKt")
    classpath = sourceSets["main"].runtimeClasspath
    systemProperty("app.env", "dev")
    systemProperty("app.mode", "cli")
}

tasks.register<JavaExec>("runStagingCli") {
    group = "application"
    description = "Runs the application in staging environment (CLI mode)"
    mainClass.set("net.maciejkasik.MainKt")
    classpath = sourceSets["main"].runtimeClasspath
    systemProperty("app.env", "staging")
    systemProperty("app.mode", "cli")
}

tasks.register<JavaExec>("runProdCli") {
    group = "application"
    description = "Runs the application in production environment (CLI mode)"
    mainClass.set("net.maciejkasik.MainKt")
    classpath = sourceSets["main"].runtimeClasspath
    systemProperty("app.env", "prod")
    systemProperty("app.mode", "cli")
}

tasks.register<JavaExec>("runDevApi") {
    group = "application"
    description = "Runs the application in development environment (API mode)"
    mainClass.set("net.maciejkasik.MainKt")
    classpath = sourceSets["main"].runtimeClasspath
    systemProperty("app.env", "dev")
    systemProperty("app.mode", "api")
}

tasks.register<JavaExec>("runStagingApi") {
    group = "application"
    description = "Runs the application in staging environment (API mode)"
    mainClass.set("net.maciejkasik.MainKt")
    classpath = sourceSets["main"].runtimeClasspath
    systemProperty("app.env", "staging")
    systemProperty("app.mode", "api")
}

tasks.register<JavaExec>("runProdApi") {
    group = "application"
    description = "Runs the application in production environment (API mode)"
    mainClass.set("net.maciejkasik.MainKt")
    classpath = sourceSets["main"].runtimeClasspath
    systemProperty("app.env", "prod")
    systemProperty("app.mode", "api")
} 