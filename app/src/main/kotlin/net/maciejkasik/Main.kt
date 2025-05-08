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
        AppMode.CLI -> {
            // Uruchom nową wersję CLI (v2) - już nie używamy starej wersji CLI
            val cliApp = CliApp()
            
            if (cliArgs.command == "v2" && cliArgs.commandArgs.isNotEmpty()) {
                // Obsługa komend ze starym prefixem v2 (dla kompatybilności)
                cliApp.run(cliArgs.commandArgs.toTypedArray())
            } else {
                // Bezpośrednia obsługa komend bez v2
                val commandArgs = if (cliArgs.command != null) {
                    arrayOf(cliArgs.command) + cliArgs.commandArgs.toTypedArray()
                } else {
                    emptyArray()
                }
                cliApp.run(commandArgs)
            }
        }
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