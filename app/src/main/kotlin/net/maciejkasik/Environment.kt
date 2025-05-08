package net.maciejkasik

/**
 * Enum reprezentujący różne środowiska aplikacji
 */
enum class Environment {
    DEVELOPMENT,
    STAGING, 
    PRODUCTION;
    
    companion object {
        /**
         * Pobiera aktualne środowisko na podstawie zmiennej systemowej lub argumentów
         * Domyślnie zwraca DEVELOPMENT
         */
        fun getCurrent(): Environment {
            val envName = System.getenv("APP_ENV") ?: "dev"
            return when(envName.lowercase()) {
                "prod", "production" -> PRODUCTION
                "stage", "staging" -> STAGING
                else -> DEVELOPMENT
            }
        }
    }
}

/**
 * Tryb działania aplikacji
 */
enum class AppMode {
    CLI,    // Tryb konsolowy
    API;    // Tryb API dla frontendu
    
    companion object {
        /**
         * Pobiera aktualny tryb na podstawie zmiennej systemowej lub argumentów
         * Domyślnie zwraca CLI
         */
        fun getCurrent(): AppMode {
            val modeName = System.getenv("APP_MODE") ?: "cli"
            return when(modeName.lowercase()) {
                "api", "server" -> API
                else -> CLI
            }
        }
    }
}

/**
 * Klasa reprezentująca konfigurację aplikacji dla różnych środowisk
 */
data class AppConfig(
    val apiBaseUrl: String,
    val outputDirectory: String,
    val loggingEnabled: Boolean,
    val requestTimeout: Long, // w sekundach
    val serverPort: Int,      // port dla trybu API
    val corsAllowedOrigins: List<String> // dozwolone źródła dla CORS
)

/**
 * Obiekt dostarczający konfigurację na podstawie wybranego środowiska
 */
object ConfigProvider {
    // Przechowuje niestandardowe katalogi wyjściowe dla każdego środowiska
    private val customOutputDirectories = mutableMapOf<Environment, String>()
    
    /**
     * Pobiera konfigurację dla określonego środowiska
     */
    fun getConfig(env: Environment = Environment.getCurrent()): AppConfig {
        // Sprawdź, czy istnieje niestandardowy katalog dla danego środowiska
        val customDir = customOutputDirectories[env]
        
        val baseConfig = when(env) {
            Environment.DEVELOPMENT -> AppConfig(
                apiBaseUrl = "https://jsonplaceholder.typicode.com",
                outputDirectory = "./posts",
                loggingEnabled = true,
                requestTimeout = 30,
                serverPort = 8080,
                corsAllowedOrigins = listOf("http://localhost:3000", "http://localhost:5173")
            )
            Environment.STAGING -> AppConfig(
                apiBaseUrl = "https://jsonplaceholder.typicode.com",
                outputDirectory = "./posts_staging",
                loggingEnabled = true,
                requestTimeout = 20,
                serverPort = 8080,
                corsAllowedOrigins = listOf("https://staging.jsonplaceholder-app.example")
            )
            Environment.PRODUCTION -> AppConfig(
                apiBaseUrl = "https://jsonplaceholder.typicode.com",
                outputDirectory = "./posts",
                loggingEnabled = false,
                requestTimeout = 10,
                serverPort = 8080,
                corsAllowedOrigins = listOf("https://jsonplaceholder-app.example")
            )
        }
        
        // Jeśli jest niestandardowy katalog, użyj go zamiast domyślnego
        return if (customDir != null) {
            baseConfig.copy(outputDirectory = customDir)
        } else {
            baseConfig
        }
    }
    
    /**
     * Aktualizuje katalog wyjściowy dla określonego środowiska
     * Zwraca zaktualizowaną ścieżkę
     */
    fun updateOutputDirectory(env: Environment, newDirectory: String): String {
        customOutputDirectories[env] = newDirectory
        return newDirectory
    }
}