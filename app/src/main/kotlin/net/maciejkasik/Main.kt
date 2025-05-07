package net.maciejkasik

import kotlinx.coroutines.runBlocking

/**
 * Application entry point
 * Fetches all posts from JSONPlaceholder and saves them as individual JSON files
 * with support for different environments (dev, staging, prod)
 * and two operation modes: CLI and API
 */
fun main(args: Array<String>) {
    // Parse arguments
    val cliArgs = CliArgs.parseArgs(args)
    
    // Read environment and mode from system properties or CLI args
    val env = cliArgs.env ?: getEnvironmentFromSystem()
    val mode = cliArgs.mode ?: getModeFromSystem()
    val config = ConfigProvider.getConfig(env)
    
    println("====== JSONPlaceholder post downloader ======")
    println("Środowisko: ${env.name}")
    println("Tryb pracy: ${mode.name}")
    println("Katalog wyjściowy: ${config.outputDirectory}")
    println("Tryb logowania: ${if (config.loggingEnabled) "WŁĄCZONY" else "WYŁĄCZONY"}")
    
    // Print system properties for debugging
    println("System properties:")
    println("  app.env = ${System.getProperty("app.env") ?: "null"}")
    println("  app.mode = ${System.getProperty("app.mode") ?: "null"}")
    println("Environment variables:")
    println("  APP_ENV = ${System.getenv("APP_ENV") ?: "null"}")
    println("  APP_MODE = ${System.getenv("APP_MODE") ?: "null"}")
    
    // Execute the appropriate mode
    when (mode) {
        AppMode.CLI -> runCliMode(env, config, cliArgs.command, cliArgs.commandArgs)
        AppMode.API -> runApiMode(env)
    }
}

/**
 * Klasa do parsowania argumentów wiersza poleceń
 */
class CliArgs(
    val env: Environment? = null,
    val mode: AppMode? = null,
    val command: String? = null,
    val commandArgs: List<String> = emptyList()
) {
    companion object {
        fun parseArgs(args: Array<String>): CliArgs {
            var env: Environment? = null
            var mode: AppMode? = null
            var command: String? = null
            val commandArgs = mutableListOf<String>()
            
            var i = 0
            while (i < args.size) {
                when (args[i]) {
                    "-e", "--env", "--environment" -> {
                        if (i + 1 < args.size) {
                            env = when (args[i + 1].lowercase()) {
                                "prod", "production" -> Environment.PRODUCTION
                                "stage", "staging" -> Environment.STAGING
                                "dev", "development" -> Environment.DEVELOPMENT
                                else -> null
                            }
                            i += 2
                        } else {
                            i++
                        }
                    }
                    "-m", "--mode" -> {
                        if (i + 1 < args.size) {
                            mode = when (args[i + 1].lowercase()) {
                                "api", "server" -> AppMode.API
                                "cli" -> AppMode.CLI
                                else -> null
                            }
                            i += 2
                        } else {
                            i++
                        }
                    }
                    "server", "serve" -> {
                        mode = AppMode.API
                        i++
                    }
                    else -> {
                        if (command == null) {
                            command = args[i]
                        } else {
                            commandArgs.add(args[i])
                        }
                        i++
                    }
                }
            }
            
            return CliArgs(env, mode, command, commandArgs)
        }
    }
}

/**
 * Uruchamia aplikację w trybie konsolowym
 */
private fun runCliMode(env: Environment, config: AppConfig, command: String?, commandArgs: List<String>) = runBlocking {
    println("Uruchamianie w trybie CLI...")
    
    val cmd = command?.lowercase() ?: "help"
    
    when (cmd) {
        "fetch", "download" -> fetchPosts(config)
        "clear" -> clearDirectory(config)
        "list", "ls" -> listSavedPosts(config)
        "get" -> {
            val id = commandArgs.firstOrNull()?.toIntOrNull()
            if (id != null) {
                getPostById(id, config)
            } else {
                println("Błąd: Nie podano ID postu")
                printCliHelp()
            }
        }
        "save" -> {
            if (commandArgs.isEmpty()) {
                saveAllPosts(config)
            } else {
                val id = commandArgs.firstOrNull()?.toIntOrNull()
                if (id != null) {
                    savePostById(id, config)
                } else {
                    println("Błąd: Nieprawidłowe ID postu")
                    printCliHelp()
                }
            }
        }
        "server", "serve" -> {
            println("Przełączanie do trybu API...")
            runApiMode(env)
        }
        "help", "--help", "-h" -> printCliHelp()
        else -> {
            println("Nieznana komenda: $cmd")
            printCliHelp()
        }
    }
}

/**
 * Wyświetla pomoc dla CLI
 */
private fun printCliHelp() {
    println("""
        Dostępne komendy:
        - fetch, download      : Pobiera wszystkie posty i zapisuje je do plików
        - save [id]            : Zapisuje wszystkie posty lub post o podanym ID
        - clear                : Czyści katalog wyjściowy
        - list, ls             : Wyświetla listę zapisanych postów
        - get <id>             : Pobiera i wyświetla post o podanym ID
        - server, serve        : Uruchamia aplikację w trybie serwera API
        - help                 : Wyświetla tę pomoc
        
        Opcje:
        -e, --env <env>        : Ustawia środowisko (dev, stage, prod)
        -m, --mode <mode>      : Ustawia tryb pracy (cli, api)
        
        Przykłady:
        java -jar app.jar                       : Wyświetla pomoc
        java -jar app.jar fetch                 : Pobiera wszystkie posty
        java -jar app.jar get 1                 : Pobiera post o ID 1
        java -jar app.jar -e prod fetch         : Pobiera posty w środowisku produkcyjnym
        java -jar app.jar server                : Uruchamia serwer API
        java -jar app.jar --env dev --mode api  : Uruchamia serwer API w środowisku dev
    """.trimIndent())
}

/**
 * Zapisuje post o określonym ID
 */
private fun savePostById(id: Int, config: AppConfig) = runBlocking {
    try {
        val apiService = ServiceBuilder.buildService(ApiService::class.java)
        println("Pobieranie postu o ID: $id...")
        val post = apiService.getPost(id)
        
        val outputDir = config.outputDirectory
        val outputDirectory = java.io.File(outputDir)
        if (!outputDirectory.exists()) {
            outputDirectory.mkdirs()
            println("Utworzono katalog wyjściowy: $outputDir")
        }
        
        if (FileUtils.savePostAsJson(post)) {
            println("Post o ID $id został zapisany do pliku $outputDir/${post.id}.json")
        } else {
            println("Nie udało się zapisać postu o ID $id")
        }
    } catch (e: Exception) {
        println("Wystąpił błąd: ${e.message}")
    }
}

/**
 * Zapisuje wszystkie posty
 */
private fun saveAllPosts(config: AppConfig) = runBlocking {
    try {
        val apiService = ServiceBuilder.buildService(ApiService::class.java)
        println("Pobieranie wszystkich postów...")
        val posts = apiService.getPosts()
        println("Pobrano ${posts.size} postów")
        
        val outputDir = config.outputDirectory
        val outputDirectory = java.io.File(outputDir)
        if (!outputDirectory.exists()) {
            outputDirectory.mkdirs()
            println("Utworzono katalog wyjściowy: $outputDir")
        }
        
        println("Zapisywanie postów...")
        var successCount = 0
        
        posts.forEach { post ->
            if (FileUtils.savePostAsJson(post)) {
                successCount++
            }
        }
        
        println("Zapisano $successCount z ${posts.size} postów do katalogu $outputDir")
    } catch (e: Exception) {
        println("Wystąpił błąd: ${e.message}")
    }
}

/**
 * Pobiera wszystkie posty
 */
private fun fetchPosts(config: AppConfig) = runBlocking {
    try {
        val apiService = ServiceBuilder.buildService(ApiService::class.java)
        println("Pobieranie postów z JSONPlaceholder API...")
        val posts = apiService.getPosts()
        println("Pobrano ${posts.size} postów:")
        
        posts.take(10).forEach { post ->
            println("- [${post.id}] ${post.title}")
        }
        
        if (posts.size > 10) {
            println("... i ${posts.size - 10} więcej")
        }
        
        println("\nAby zapisać posty, użyj komendy 'save'")
    } catch (e: Exception) {
        println("Wystąpił błąd: ${e.message}")
    }
}

/**
 * Domyślna operacja CLI - pobiera wszystkie posty
 */
private fun runDefaultCliOperation(env: Environment, config: AppConfig) = runBlocking {
    try {
        // Wyczyść katalog wyjściowy jeśli to środowisko deweloperskie
        if (env == Environment.DEVELOPMENT) {
            FileUtils.clearOutputDirectory()
        }
        
        // Create service
        val apiService = ServiceBuilder.buildService(ApiService::class.java)
        
        // Fetch all posts
        println("Fetching posts from JSONPlaceholder API...")
        val posts = apiService.getPosts()
        println("Successfully fetched ${posts.size} posts")
        
        // Create output directory
        val outputDir = config.outputDirectory
        val outputDirectory = java.io.File(outputDir)
        if (!outputDirectory.exists()) {
            outputDirectory.mkdirs()
            println("Created output directory: $outputDir")
        }
        
        // Save each post to a separate file
        println("Saving posts to individual files...")
        var successCount = 0
        
        posts.forEach { post ->
            if (FileUtils.savePostAsJson(post)) {
                successCount++
            }
        }
        
        println("Successfully saved $successCount out of ${posts.size} posts to $outputDir directory")
        println("Each post is saved as <id>.json")
    } catch (e: Exception) {
        println("An error occurred: ${e.message}")
        e.printStackTrace()
    }
}

/**
 * Wyświetla listę zapisanych postów
 */
private fun listSavedPosts(config: AppConfig) {
    val directory = java.io.File(config.outputDirectory)
    if (!directory.exists() || !directory.isDirectory) {
        println("Katalog ${config.outputDirectory} nie istnieje")
        return
    }
    
    val files = directory.listFiles { file -> file.isFile && file.name.endsWith(".json") }
    if (files.isNullOrEmpty()) {
        println("Brak zapisanych postów")
        return
    }
    
    println("Zapisane posty (${files.size}):")
    files.forEach { file ->
        val postId = file.nameWithoutExtension
        println("- Post ID: $postId, Plik: ${file.name}")
    }
}

/**
 * Czyści katalog wyjściowy
 */
private fun clearDirectory(config: AppConfig) {
    val success = FileUtils.clearOutputDirectory()
    if (success) {
        println("Katalog ${config.outputDirectory} został wyczyszczony")
    } else {
        println("Nie udało się wyczyścić katalogu ${config.outputDirectory}")
    }
}

/**
 * Pobiera i wyświetla post o podanym ID
 */
private fun getPostById(id: Int, config: AppConfig) = runBlocking {
    try {
        val apiService = ServiceBuilder.buildService(ApiService::class.java)
        println("Pobieranie postu o ID: $id")
        val post = apiService.getPost(id)
        
        println("Post $id:")
        println("  Tytuł: ${post.title}")
        println("  Treść: ${post.body}")
        println("  Użytkownik: ${post.userId}")
        
        println("\nCzy chcesz zapisać ten post? (t/n)")
        val input = readLine()?.lowercase()
        
        if (input == "t" || input == "tak") {
            if (FileUtils.savePostAsJson(post)) {
                println("Post został zapisany do pliku ${config.outputDirectory}/${post.id}.json")
            } else {
                println("Nie udało się zapisać postu")
            }
        }
    } catch (e: Exception) {
        println("Wystąpił błąd: ${e.message}")
    }
}

/**
 * Uruchamia aplikację w trybie API (serwer)
 */
private fun runApiMode(env: Environment) {
    println("Uruchamianie serwera API...")
    val server = ApiServer(env)
    server.start()
}

/**
 * Get environment from system property or fallback to environment variable
 */
private fun getEnvironmentFromSystem(): Environment {
    val envValue = System.getProperty("app.env") ?: System.getenv("APP_ENV") ?: "dev"
    
    return when (envValue.lowercase()) {
        "prod", "production" -> Environment.PRODUCTION
        "stage", "staging" -> Environment.STAGING
        else -> Environment.DEVELOPMENT
    }
}

/**
 * Get application mode from system property or fallback to environment variable
 */
private fun getModeFromSystem(): AppMode {
    val modeValue = System.getProperty("app.mode") ?: System.getenv("APP_MODE") ?: "cli"
    
    return when (modeValue.lowercase()) {
        "api", "server" -> AppMode.API
        else -> AppMode.CLI
    }
} 