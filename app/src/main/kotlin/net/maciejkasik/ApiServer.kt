package net.maciejkasik

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

@Serializable
data class OutputDirectoryRequest(val outputDirectory: String)

@Serializable
data class OutputDirectoryResponse(
    val success: Boolean,
    val message: String,
    val config: EnvironmentInfo
)

@Serializable
data class EnvironmentInfo(
    val environment: String,
    val version: String,
    val outputDirectory: String,
    val lastFetchTime: String? = null
)

// Define a filter request model for posts
@Serializable
data class PostFilterParams(
    val minId: Int? = null,
    val maxId: Int? = null,
    val titleContains: String? = null,
    val bodyContains: String? = null,
    val fetchDateAfter: String? = null
)

// Response classes for API endpoints
@Serializable
data class QuickRefreshResponse(
    val success: Boolean,
    val totalChecked: Int,
    val totalAdded: Int,
    val posts: List<Post>
)

@Serializable
data class HardRefreshResponse(
    val success: Boolean,
    val totalFetched: Int,
    val totalRefreshed: Int = 0,
    val posts: List<Post>
)

@Serializable
data class RefreshStatusResponse(
    val isRefreshing: Boolean,
    val refreshStartTime: Long?,
    val refreshType: String?,
    val withRelations: Boolean?
)

@Serializable
data class ErrorResponse(
    val error: String
)

@Serializable
data class PostsResponse(
    val posts: List<Post>,
    val hasRelations: Boolean
)

// Globalne flagi stanu odświeżania
private val isRefreshing = AtomicBoolean(false)
private val refreshStartTime = AtomicLong(0)
private var refreshType: String? = null
private var refreshWithRelations: Boolean? = null

/**
 * Klasa odpowiedzialna za uruchomienie i konfigurację serwera API
 */
class ApiServer(private val env: Environment) {
    private val config = ConfigProvider.getConfig(env)
    private val apiService = ServiceBuilder.buildService(ApiService::class.java)
    
    /**
     * Uruchamia serwer API
     */
    fun start() {
        var port = config.serverPort
        val maxAttempts = 5
        
        for (attempt in 1..maxAttempts) {
            try {
                println("Próba uruchomienia serwera na porcie: $port (próba $attempt/$maxAttempts)")
                
                embeddedServer(Netty, port = port) {
                    configureServer()
                    configureRouting()
                }.start(wait = true)
                
                // If we reach here, the server started successfully
                break
            } catch (e: Exception) {
                if (e.cause is java.net.BindException && e.message?.contains("Address already in use") == true) {
                    if (attempt < maxAttempts) {
                        // Try the next port
                        println("Port $port jest już używany, próbuję port: ${port + 1}...")
                        port++
                    } else {
                        println("Nie można uruchomić serwera po $maxAttempts próbach. Wszystkie porty są zajęte.")
                        throw e
                    }
                } else {
                    // Different exception - rethrow it
                    println("Błąd podczas uruchamiania serwera: ${e.message}")
                    throw e
                }
            }
        }
    }
    
    /**
     * Konfiguruje serwer (CORS, serializacja JSON itd.)
     */
    private fun Application.configureServer() {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                // Allow serialization of 'content'-based classes 
                useArrayPolymorphism = true
            })
        }
        
        install(CORS) {
            anyHost()  // Allow requests from any host
            allowMethod(HttpMethod.Get)
            allowMethod(HttpMethod.Post)
            allowMethod(HttpMethod.Delete)
            allowMethod(HttpMethod.Options)
            allowMethod(HttpMethod.Put)
            allowMethod(HttpMethod.Patch)
            allowHeader(HttpHeaders.ContentType)
            allowHeader(HttpHeaders.Authorization)
            allowHeader(HttpHeaders.AccessControlAllowOrigin)
            allowHeader(HttpHeaders.Origin)
            allowHeader(HttpHeaders.Accept)
            allowHeader("Cache-Control")
            allowHeader("Pragma")
            allowHeader("Expires")
            allowHeader("X-Requested-With")
            allowHeader("Access-Control-Allow-Headers")
            allowHeader("Access-Control-Allow-Methods")
            allowHeader("Access-Control-Allow-Credentials")
            allowCredentials = true
            maxAgeInSeconds = 3600
            exposeHeader("Access-Control-Allow-Origin")
            exposeHeader("Access-Control-Allow-Credentials")
        }
        
        install(StatusPages) {
            exception<Throwable> { call, cause ->
                call.respondText(
                    text = "500: ${cause.message}",
                    status = HttpStatusCode.InternalServerError
                )
            }
        }
    }
    
    /**
     * Funkcja pomocnicza dla filtrowania postów zgodnie z parametrami
     */
    private fun filterPosts(posts: List<Post>, filterParams: PostFilterParams): List<Post> {
        var filteredPosts = posts
        
        // Apply ID range filter if provided
        if (filterParams.minId != null) {
            filteredPosts = filteredPosts.filter { it.id >= filterParams.minId }
        }
        
        if (filterParams.maxId != null) {
            filteredPosts = filteredPosts.filter { it.id <= filterParams.maxId }
        }
        
        // Apply title filter if provided
        if (!filterParams.titleContains.isNullOrBlank()) {
            filteredPosts = filteredPosts.filter { 
                it.title.contains(filterParams.titleContains, ignoreCase = true) 
            }
        }
        
        // Apply body filter if provided
        if (!filterParams.bodyContains.isNullOrBlank()) {
            filteredPosts = filteredPosts.filter { 
                it.body.contains(filterParams.bodyContains, ignoreCase = true) 
            }
        }
        
        // Apply fetch date filter if provided
        if (!filterParams.fetchDateAfter.isNullOrBlank()) {
            try {
                val filterDate = LocalDateTime.parse(
                    filterParams.fetchDateAfter,
                    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
                )
                
                filteredPosts = filteredPosts.filter { post ->
                    if (post.fetchDate == null) return@filter false
                    
                    val postDate = LocalDateTime.parse(
                        post.fetchDate,
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    )
                    postDate.isAfter(filterDate)
                }
            } catch (e: Exception) {
                // Log the error but continue without applying fetch date filter
                println("Error parsing fetchDateAfter: ${e.message}")
            }
        }
        
        return filteredPosts
    }
    
    /**
     * Funkcja pomocnicza do filtrowania PostWithRelations
     */
    private fun filterPostsWithRelations(posts: List<PostWithRelations>, filterParams: PostFilterParams): List<PostWithRelations> {
        var filteredPosts = posts
        
        // Apply ID range filter if provided
        if (filterParams.minId != null) {
            filteredPosts = filteredPosts.filter { it.id >= filterParams.minId }
        }
        
        if (filterParams.maxId != null) {
            filteredPosts = filteredPosts.filter { it.id <= filterParams.maxId }
        }
        
        // Apply title filter if provided
        if (!filterParams.titleContains.isNullOrBlank()) {
            filteredPosts = filteredPosts.filter { 
                it.title.contains(filterParams.titleContains, ignoreCase = true) 
            }
        }
        
        // Apply body filter if provided
        if (!filterParams.bodyContains.isNullOrBlank()) {
            filteredPosts = filteredPosts.filter { 
                it.body.contains(filterParams.bodyContains, ignoreCase = true) 
            }
        }
        
        // Apply fetch date filter if provided
        if (!filterParams.fetchDateAfter.isNullOrBlank()) {
            try {
                val filterDate = LocalDateTime.parse(
                    filterParams.fetchDateAfter,
                    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
                )
                
                filteredPosts = filteredPosts.filter { post ->
                    if (post.fetchDate == null) return@filter false
                    
                    val postDate = LocalDateTime.parse(
                        post.fetchDate,
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    )
                    postDate.isAfter(filterDate)
                }
            } catch (e: Exception) {
                // Log the error but continue without applying fetch date filter
                println("Error parsing fetchDateAfter: ${e.message}")
            }
        }
        
        return filteredPosts
    }
    
    /**
     * Funkcja pomocnicza zwracająca aktualny czas w formacie czytelnym
     */
    private fun getCurrentFormattedDateTime(): String {
        val current = LocalDateTime.now()
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        return current.format(formatter)
    }
    
    /**
     * Zwraca skonfigurowany parser JSON
     */
    private fun getJsonParser(): Json {
        return Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
            useArrayPolymorphism = true
        }
    }
    
    /**
     * Konfiguruje endpointy API
     */
    private fun Application.configureRouting() {
        routing {
            route("/api") {
                // Informacje o środowisku
                get("/info") {
                    // Sprawdź, czy klient chce wymusić odświeżenie danych
                    val refresh = call.request.queryParameters["refresh"] != null
                    
                    // Pobierz aktualną konfigurację
                    val currentConfig = ConfigProvider.getConfig(env)
                    
                    call.respond(EnvironmentInfo(
                        environment = env.name,
                        version = "1.0.0",
                        outputDirectory = currentConfig.outputDirectory,
                        lastFetchTime = getCurrentFormattedDateTime()
                    ))
                }
                
                // Endpoint do sprawdzania stanu odświeżania
                get("/refresh-status") {
                    call.respond(RefreshStatusResponse(
                        isRefreshing = isRefreshing.get(),
                        refreshStartTime = if (refreshStartTime.get() > 0) refreshStartTime.get() else null,
                        refreshType = refreshType,
                        withRelations = refreshWithRelations
                    ))
                }
                
                // Endpoint do zmiany katalogu wyjściowego
                post("/config/output-directory") {
                    try {
                        // Odczytaj żądaną ścieżkę z ciała zapytania
                        val request = call.receive<OutputDirectoryRequest>()
                        val newDirectory = request.outputDirectory
                        
                        // Sprawdź, czy katalog istnieje, jeśli nie - utwórz go
                        val directory = java.io.File(newDirectory)
                        if (!directory.exists()) {
                            directory.mkdirs()
                        }
                        
                        // Zapisz nowy katalog do zmiennej statycznej aby był dostępny dla wszystkich komponentów
                        val staticOutputDir = ConfigProvider.updateOutputDirectory(env, newDirectory)
                        
                        // Utwórz nową konfigurację z zaktualizowaną ścieżką
                        val updatedConfig = ConfigProvider.getConfig(env)
                        
                        // Odpowiedz z nową konfiguracją
                        call.respond(OutputDirectoryResponse(
                            success = true,
                            message = "Output directory updated successfully",
                            config = EnvironmentInfo(
                                version = "1.0.0",
                                environment = env.name,
                                outputDirectory = updatedConfig.outputDirectory,
                                lastFetchTime = getCurrentFormattedDateTime()
                            )
                        ))
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = ErrorResponse(e.message ?: "Unknown error")
                        )
                    }
                }
                
                // Pobierz wszystkie posty
                get("/posts") {
                    try {
                        // Check if a refresh was requested
                        val refresh = call.request.queryParameters["refresh"] != null
                        
                        // Get filter parameters
                        val filterParams = PostFilterParams(
                            minId = call.request.queryParameters["minId"]?.toIntOrNull(),
                            maxId = call.request.queryParameters["maxId"]?.toIntOrNull(),
                            titleContains = call.request.queryParameters["titleContains"],
                            bodyContains = call.request.queryParameters["bodyContains"],
                            fetchDateAfter = call.request.queryParameters["fetchDateAfter"]
                        )
                        
                        // Jeśli przetwarzanie odświeżania jest w toku, zwróć informację o tym
                        if (refresh && isRefreshing.get()) {
                            call.respond(
                                status = HttpStatusCode.TooManyRequests,
                                message = hashMapOf(
                                    "error" to "Refresh already in progress",
                                    "isRefreshing" to true,
                                    "refreshStartTime" to refreshStartTime.get(),
                                    "refreshType" to refreshType,
                                    "withRelations" to refreshWithRelations
                                )
                            )
                            return@get
                        }
                        
                        // Get the output directory from config
                        val directory = java.io.File(config.outputDirectory)
                        if (!directory.exists()) {
                            directory.mkdirs()
                        }
                        
                        // If refresh is requested or no JSON files exist, fetch from API
                        if (refresh || 
                            !directory.exists() || 
                            !directory.isDirectory || 
                            directory.listFiles { file -> file.isFile && file.name.endsWith(".json") }?.isEmpty() == true) {
                            
                            // Ustaw flagę, że odświeżanie jest w toku
                            if (refresh && isRefreshing.compareAndSet(false, true)) {
                                refreshStartTime.set(System.currentTimeMillis())
                                refreshType = "get_posts"
                            }
                            
                            try {
                                // Fetch all posts from API
                                val allPosts = apiService.getPosts()
                                
                                // Create a list to store posts with relations
                                val postsWithRelations = mutableListOf<PostWithRelations>()
                                
                                // For each post, fetch its user and comments
                                for (post in allPosts) {
                                    try {
                                        // Fetch user by userId
                                        val user = apiService.getUser(post.userId)
                                        // Fetch comments for this post
                                        val comments = apiService.getCommentsForPost(post.id)
                                        
                                        // Create post with relations
                                        val postWithRelations = PostWithRelations(
                                            userId = post.userId,
                                            id = post.id,
                                            title = post.title,
                                            body = post.body,
                                            user = user,
                                            comments = comments,
                                            fetchDate = getCurrentFormattedDateTime()
                                        )
                                        
                                        // Save the post to file
                                        FileUtils.savePostWithRelationsAsJson(postWithRelations)
                                        
                                        postsWithRelations.add(postWithRelations)
                                    } catch (e: Exception) {
                                        // If there's an error fetching relations, still include the post but without relations
                                        val postWithRelations = PostWithRelations(
                                            userId = post.userId,
                                            id = post.id,
                                            title = post.title,
                                            body = post.body,
                                            fetchDate = getCurrentFormattedDateTime()
                                        )
                                        
                                        // Save the post to file
                                        FileUtils.savePostAsJson(Post(post.userId, post.id, post.title, post.body, getCurrentFormattedDateTime()))
                                        
                                        postsWithRelations.add(postWithRelations)
                                    }
                                }
                                
                                // Apply filters to the posts with relations
                                val filteredPosts = filterPostsWithRelations(postsWithRelations, filterParams)
                                
                                // Check if any post has relations
                                val hasRelations = filteredPosts.any { it.user != null || (it.comments != null && it.comments.isNotEmpty()) }
                                
                                // Return posts with hasRelations flag
                                call.respond(PostsResponse(
                                    posts = filteredPosts.map { 
                                        Post(it.userId, it.id, it.title, it.body, it.fetchDate)
                                    },
                                    hasRelations = hasRelations
                                ))
                            } finally {
                                // Reset the refresh state when done
                                if (refresh) {
                                    isRefreshing.set(false)
                                    refreshType = null
                                }
                            }
                        } else {
                            // If refresh is not requested and files exist, read from files
                            val jsonFiles = directory.listFiles { file -> 
                                file.isFile && file.name.endsWith(".json") 
                            } ?: emptyArray()
                            
                            // Handle posts with relations
                            val postsWithRelations = mutableListOf<PostWithRelations>()
                            
                            for (file in jsonFiles) {
                                try {
                                    val content = file.readText()
                                    // Parse as PostWithRelations
                                    val post = getJsonParser().decodeFromString<PostWithRelations>(content)
                                    postsWithRelations.add(post)
                                } catch (e: Exception) {
                                    println("Error reading post with relations from file ${file.name}: ${e.message}")
                                    // Skip this file and continue with others
                                }
                            }
                            
                            // Apply filters to the posts with relations
                            val filteredPosts = filterPostsWithRelations(postsWithRelations, filterParams)
                            
                            // Check if any post has relations
                            val hasRelations = filteredPosts.any { it.user != null || (it.comments != null && it.comments.isNotEmpty()) }
                            
                            // Return posts with hasRelations flag
                            call.respond(PostsResponse(
                                posts = filteredPosts.map { 
                                    Post(it.userId, it.id, it.title, it.body, it.fetchDate)
                                },
                                hasRelations = hasRelations
                            ))
                        }
                    } catch (e: Exception) {
                        // Reset the refresh state in case of error
                        isRefreshing.set(false)
                        refreshType = null
                        
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message.toString())
                        )
                    }
                }
                
                // Pobierz pojedynczy post
                get("/posts/{id}") {
                    try {
                        val id = call.parameters["id"]?.toIntOrNull()
                            ?: return@get call.respond(
                                status = HttpStatusCode.BadRequest,
                                message = hashMapOf("error" to "Invalid post ID")
                            )
                        
                        // Check if we should fetch with relations
                        val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                        // Check if refresh was requested
                        val refresh = call.request.queryParameters["refresh"] != null
                        
                        // Get the output directory from config
                        val directory = java.io.File(config.outputDirectory)
                        if (!directory.exists()) {
                            directory.mkdirs()
                        }
                        
                        // Check if post exists as a file and refresh is not requested
                        val file = java.io.File("${config.outputDirectory}/$id.json")
                        
                        if (!refresh && file.exists() && file.isFile) {
                            // Read post from file if not refreshing
                            try {
                                val content = file.readText()
                                if (withRelations) {
                                    // Parse as PostWithRelations
                                    val post = getJsonParser().decodeFromString<PostWithRelations>(content)
                                    call.respond(post)
                                } else {
                                    // Parse as Post
                                    val post = getJsonParser().decodeFromString<Post>(content)
                                    call.respond(post)
                                }
                                return@get
                            } catch (e: Exception) {
                                println("Error reading post from file ${file.name}: ${e.message}")
                                // Continue to fallback to external API
                            }
                        }
                        
                        // If refresh was requested or file doesn't exist, fetch from API and save
                        if (withRelations) {
                            // Fetch the post first
                            val post = apiService.getPost(id)
                            
                            try {
                                // Fetch user by userId
                                val user = apiService.getUser(post.userId)
                                // Fetch comments for this post
                                val comments = apiService.getCommentsForPost(post.id)
                                
                                // Create and respond with post with relations
                                val postWithRelations = PostWithRelations(
                                    userId = post.userId,
                                    id = post.id,
                                    title = post.title,
                                    body = post.body,
                                    user = user,
                                    comments = comments
                                )
                                
                                // Always save the post to a file
                                FileUtils.savePostWithRelationsAsJson(postWithRelations)
                                
                                call.respond(postWithRelations)
                            } catch (e: Exception) {
                                // If there's an error fetching relations, still save and respond with the post
                                FileUtils.savePostAsJson(post)
                                call.respond(post)
                            }
                        } else {
                            val post = apiService.getPost(id)
                            // Always save the post
                            FileUtils.savePostAsJson(post)
                            call.respond(post)
                        }
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message)
                        )
                    }
                }
                
                // Pobierz komentarze do posta
                get("/posts/{id}/comments") {
                    try {
                        val id = call.parameters["id"]?.toIntOrNull()
                            ?: return@get call.respond(
                                status = HttpStatusCode.BadRequest,
                                message = hashMapOf("error" to "Invalid post ID")
                            )
                            
                        val comments = apiService.getCommentsForPost(id)
                        call.respond(comments)
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message)
                        )
                    }
                }
                
                // Pobierz zapisane posty
                get("/saved-posts") {
                    try {
                        val directory = java.io.File(config.outputDirectory)
                        if (!directory.exists() || !directory.isDirectory) {
                            return@get call.respond(emptyList<String>())
                        }
                        
                        val savedPosts = directory.listFiles { file -> 
                            file.isFile && file.name.endsWith(".json") 
                        }?.map { file ->
                            file.nameWithoutExtension.toIntOrNull() ?: -1
                        }?.filter { it > 0 } ?: emptyList()
                        
                        call.respond(hashMapOf(
                            "total" to savedPosts.size,
                            "posts" to savedPosts
                        ))
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message)
                        )
                    }
                }
                
                // Sprawdź czy post jest zapisany
                get("/posts/{id}/is-saved") {
                    try {
                        val id = call.parameters["id"]?.toIntOrNull()
                            ?: return@get call.respond(
                                status = HttpStatusCode.BadRequest,
                                message = hashMapOf("error" to "Invalid post ID")
                            )
                            
                        val file = java.io.File("${config.outputDirectory}/$id.json")
                        call.respond(hashMapOf(
                            "postId" to id.toString(),
                            "isSaved" to file.exists().toString()
                        ))
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message.toString())
                        )
                    }
                }
                
                // Zapisz post do pliku
                post("/posts/save/{id}") {
                    try {
                        val id = call.parameters["id"]?.toIntOrNull()
                            ?: return@post call.respond(
                                status = HttpStatusCode.BadRequest,
                                message = hashMapOf("error" to "Invalid post ID")
                            )
                        
                        // Check if we should fetch with relations
                        val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                        var success = false
                        
                        if (withRelations) {
                            // Fetch the post with relations
                            val post = apiService.getPost(id)
                            val user = apiService.getUser(post.userId)
                            val comments = apiService.getCommentsForPost(post.id)
                            
                            // Create post with relations
                            val postWithRelations = PostWithRelations(
                                userId = post.userId,
                                id = post.id,
                                title = post.title,
                                body = post.body,
                                user = user,
                                comments = comments
                            )
                            
                            // Save post with relations
                            success = FileUtils.savePostWithRelationsAsJson(postWithRelations)
                        } else {
                            // Fetch and save regular post
                            val post = apiService.getPost(id)
                            success = FileUtils.savePostAsJson(post)
                        }
                        
                        if (success) {
                            call.respond(hashMapOf(
                                "success" to "true",
                                "message" to "Post saved successfully",
                                "filePath" to "${config.outputDirectory}/${id}.json"
                            ))
                        } else {
                            call.respond(
                                status = HttpStatusCode.InternalServerError,
                                message = hashMapOf("error" to "Failed to save post")
                            )
                        }
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message)
                        )
                    }
                }
                
                // Zapisz wszystkie posty
                post("/posts/save-all") {
                    try {
                        // Check if we should fetch with relations
                        val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                        var successCount = 0
                        
                        if (withRelations) {
                            // Fetch posts first
                            val posts = apiService.getPosts()
                            
                            runBlocking {
                                for (post in posts) {
                                    try {
                                        // Fetch user by userId
                                        val user = apiService.getUser(post.userId)
                                        // Fetch comments for this post
                                        val comments = apiService.getCommentsForPost(post.id)
                                        
                                        // Create post with relations
                                        val postWithRelations = PostWithRelations(
                                            userId = post.userId,
                                            id = post.id,
                                            title = post.title,
                                            body = post.body,
                                            user = user,
                                            comments = comments
                                        )
                                        
                                        // Save post with relations
                                        if (FileUtils.savePostWithRelationsAsJson(postWithRelations)) {
                                            successCount++
                                        }
                                    } catch (e: Exception) {
                                        // If there's an error fetching relations, still save the post but without relations
                                        if (FileUtils.savePostAsJson(post)) {
                                            successCount++
                                        }
                                    }
                                }
                            }
                        } else {
                            val posts = apiService.getPosts()
                            
                            runBlocking {
                                posts.forEach { post ->
                                    if (FileUtils.savePostAsJson(post)) {
                                        successCount++
                                    }
                                }
                            }
                        }
                        
                        call.respond(hashMapOf(
                            "success" to "true",
                            "totalPosts" to (if (withRelations) apiService.getPosts().size else apiService.getPosts().size).toString(),
                            "savedPosts" to successCount.toString(),
                            "directory" to config.outputDirectory
                        ))
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message)
                        )
                    }
                }
                
                // Usuń pojedynczy post
                delete("/posts/{id}") {
                    try {
                        val id = call.parameters["id"]?.toIntOrNull()
                            ?: return@delete call.respond(
                                status = HttpStatusCode.BadRequest,
                                message = hashMapOf("error" to "Invalid post ID")
                            )
                            
                        val file = java.io.File("${config.outputDirectory}/$id.json")
                        if (!file.exists()) {
                            return@delete call.respond(
                                status = HttpStatusCode.NotFound,
                                message = hashMapOf("error" to "Post file not found")
                            )
                        }
                        
                        val success = file.delete()
                        if (success) {
                            call.respond(hashMapOf(
                                "success" to "true",
                                "message" to "Post file deleted successfully"
                            ))
                        } else {
                            call.respond(
                                status = HttpStatusCode.InternalServerError,
                                message = hashMapOf("error" to "Failed to delete post file")
                            )
                        }
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message)
                        )
                    }
                }
                
                // Wyczyść katalog wyjściowy
                delete("/posts") {
                    try {
                        // Get the directory contents before cleaning
                        val directory = java.io.File(config.outputDirectory)
                        val filesBefore = if (directory.exists() && directory.isDirectory) {
                            directory.listFiles { file -> file.isFile && file.name.endsWith(".json") }?.size ?: 0
                        } else 0
                        
                        // Clear the directory
                        val success = FileUtils.clearOutputDirectory()
                        
                        // Get the directory contents after cleaning
                        val filesAfter = if (directory.exists() && directory.isDirectory) {
                            directory.listFiles { file -> file.isFile && file.name.endsWith(".json") }?.size ?: 0
                        } else 0
                        
                        if (success) {
                            call.respond(hashMapOf(
                                "success" to "true",
                                "message" to "Output directory cleared successfully",
                                "directory" to config.outputDirectory,
                                "filesRemoved" to filesBefore.toString(),
                                "filesRemaining" to filesAfter.toString()
                            ))
                        } else {
                            call.respond(
                                status = HttpStatusCode.InternalServerError,
                                message = hashMapOf(
                                    "error" to "Failed to clear output directory"
                                )
                            )
                        }
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf(
                                "error" to e.message.toString()
                            )
                        )
                    }
                }
                
                // Download posts as ZIP file
                get("/posts/download-zip") {
                    try {
                        // Get optional parameters
                        val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                        val idsParam = call.request.queryParameters["ids"]
                        val postIds = idsParam?.split(",")?.mapNotNull { it.trim().toIntOrNull() }
                        
                        // Create a ZIP file with selected or all posts
                        val zipFilePath = FileUtils.createPostsZipFile(postIds)
                        
                        if (zipFilePath != null) {
                            val file = File(zipFilePath)
                            if (file.exists()) {
                                // Set headers for file download
                                call.response.header(
                                    HttpHeaders.ContentDisposition,
                                    ContentDisposition.Attachment.withParameter(
                                        ContentDisposition.Parameters.FileName, file.name
                                    ).toString()
                                )
                                
                                // Serve the file for download
                                call.respondFile(file)
                                
                                // Optionally delete the file after sending it (uncomment if needed)
                                // file.delete()
                            } else {
                                call.respond(
                                    status = HttpStatusCode.NotFound,
                                    message = hashMapOf("error" to "ZIP file not found after creation")
                                )
                            }
                        } else {
                            // No files to zip or error creating ZIP
                            call.respond(
                                status = HttpStatusCode.BadRequest,
                                message = hashMapOf("error" to "No posts available to download or error creating ZIP file")
                            )
                        }
                    } catch (e: Exception) {
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf("error" to e.message.toString())
                        )
                    }
                }

                // Quick refresh endpoint - fetch only missing posts
                post("/posts/quick-refresh") {
                    try {
                        // Jeśli przetwarzanie odświeżania jest w toku, zwróć informację o tym
                        if (isRefreshing.get()) {
                            call.respond(
                                status = HttpStatusCode.TooManyRequests,
                                message = hashMapOf(
                                    "error" to "Refresh already in progress",
                                    "isRefreshing" to true,
                                    "refreshStartTime" to refreshStartTime.get(),
                                    "refreshType" to refreshType
                                )
                            )
                            return@post
                        }
                        
                        // Get withRelations parameter
                        val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                        
                        // Ustaw flagę, że odświeżanie jest w toku
                        if (isRefreshing.compareAndSet(false, true)) {
                            refreshStartTime.set(System.currentTimeMillis())
                            refreshType = "quick_refresh"
                            refreshWithRelations = withRelations
                        }
                        
                        try {
                            // Get the output directory from config
                            val directory = java.io.File(config.outputDirectory)
                            if (!directory.exists()) {
                                directory.mkdirs()
                            }
                            
                            // Get existing post IDs from files
                            val existingPostIds = directory.listFiles { file -> 
                                file.isFile && file.name.endsWith(".json") 
                            }?.mapNotNull { 
                                file -> file.nameWithoutExtension.toIntOrNull() 
                            }?.toSet() ?: emptySet()
                            
                            // Fetch all posts from API
                            val allPosts = apiService.getPosts()
                            
                            // Filter to only get posts that don't exist locally
                            val newPosts = allPosts.filter { post -> !existingPostIds.contains(post.id) }
                            
                            if (withRelations) {
                                // Save new posts with relations
                                newPosts.forEach { post ->
                                    try {
                                        // Fetch user by userId
                                        val user = apiService.getUser(post.userId)
                                        // Fetch comments for this post
                                        val comments = apiService.getCommentsForPost(post.id)
                                        
                                        // Create post with relations
                                        val postWithRelations = PostWithRelations(
                                            userId = post.userId,
                                            id = post.id,
                                            title = post.title,
                                            body = post.body,
                                            user = user,
                                            comments = comments,
                                            fetchDate = getCurrentFormattedDateTime()
                                        )
                                        
                                        // Save post with relations
                                        FileUtils.savePostWithRelationsAsJson(postWithRelations)
                                    } catch (e: Exception) {
                                        // If there's an error fetching relations, still save the post but without relations
                                        val postWithDate = post.copy(fetchDate = getCurrentFormattedDateTime())
                                        FileUtils.savePostAsJson(postWithDate)
                                    }
                                }
                            } else {
                                // Save new posts without relations
                                newPosts.forEach { post ->
                                    val postWithDate = post.copy(fetchDate = getCurrentFormattedDateTime())
                                    FileUtils.savePostAsJson(postWithDate)
                                }
                            }
                            
                            // Create response
                            val response = QuickRefreshResponse(
                                success = true,
                                totalChecked = allPosts.size,
                                totalAdded = newPosts.size,
                                posts = newPosts.map { it.copy(fetchDate = getCurrentFormattedDateTime()) }
                            )
                            
                            call.respond(response)
                        } finally {
                            // Reset the refresh state when done
                            isRefreshing.set(false)
                            refreshType = null
                            refreshWithRelations = null
                        }
                    } catch (e: Exception) {
                        // Reset the refresh state in case of error
                        isRefreshing.set(false)
                        refreshType = null
                        refreshWithRelations = null
                        
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = ErrorResponse(error = e.message ?: "Unknown error during quick refresh")
                        )
                    }
                }

                // Hard refresh endpoint - fetch all posts
                post("/posts/hard-refresh") {
                    try {
                        // Jeśli przetwarzanie odświeżania jest w toku, zwróć informację o tym
                        if (isRefreshing.get()) {
                            call.respond(
                                status = HttpStatusCode.TooManyRequests,
                                message = hashMapOf(
                                    "error" to "Refresh already in progress",
                                    "isRefreshing" to true,
                                    "refreshStartTime" to refreshStartTime.get(),
                                    "refreshType" to refreshType
                                )
                            )
                            return@post
                        }
                        
                        // Get withRelations parameter
                        val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                        
                        // Ustaw flagę, że odświeżanie jest w toku
                        if (isRefreshing.compareAndSet(false, true)) {
                            refreshStartTime.set(System.currentTimeMillis())
                            refreshType = "hard_refresh"
                            refreshWithRelations = withRelations
                        }
                        
                        try {
                            // Get the output directory from config
                            val directory = java.io.File(config.outputDirectory)
                            if (!directory.exists()) {
                                directory.mkdirs()
                            }
                            
                            // Clear the directory
                            directory.listFiles()?.forEach { it.delete() }
                            
                            // Fetch all posts from API
                            val allPosts = apiService.getPosts()
                            
                            if (withRelations) {
                                // Save posts with relations
                                allPosts.forEach { post ->
                                    try {
                                        // Fetch user by userId
                                        val user = apiService.getUser(post.userId)
                                        // Fetch comments for this post
                                        val comments = apiService.getCommentsForPost(post.id)
                                        
                                        // Create post with relations
                                        val postWithRelations = PostWithRelations(
                                            userId = post.userId,
                                            id = post.id,
                                            title = post.title,
                                            body = post.body,
                                            user = user,
                                            comments = comments,
                                            fetchDate = getCurrentFormattedDateTime()
                                        )
                                        
                                        // Save post with relations
                                        FileUtils.savePostWithRelationsAsJson(postWithRelations)
                                    } catch (e: Exception) {
                                        // If there's an error fetching relations, still save the post but without relations
                                        val postWithDate = post.copy(fetchDate = getCurrentFormattedDateTime())
                                        FileUtils.savePostAsJson(postWithDate)
                                    }
                                }
                            } else {
                                // Save regular posts
                                allPosts.forEach { post ->
                                    val postWithDate = post.copy(fetchDate = getCurrentFormattedDateTime())
                                    FileUtils.savePostAsJson(postWithDate)
                                }
                            }
                            
                            // Create response
                            val response = HardRefreshResponse(
                                success = true,
                                totalFetched = allPosts.size,
                                totalRefreshed = allPosts.size,
                                posts = allPosts.map { it.copy(fetchDate = getCurrentFormattedDateTime()) }
                            )
                            
                            call.respond(response)
                        } finally {
                            // Reset the refresh state when done
                            isRefreshing.set(false)
                            refreshType = null
                            refreshWithRelations = null
                        }
                    } catch (e: Exception) {
                        // Reset the refresh state in case of error
                        isRefreshing.set(false)
                        refreshType = null
                        refreshWithRelations = null
                        
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf(
                                "error" to e.message.toString()
                            )
                        )
                    }
                }

                // Clear posts endpoint
                post("/posts/clear") {
                    try {
                        // Jeśli przetwarzanie odświeżania jest w toku, zwróć informację o tym
                        if (isRefreshing.get()) {
                            call.respond(
                                status = HttpStatusCode.TooManyRequests,
                                message = hashMapOf(
                                    "error" to "Refresh or clear operation already in progress",
                                    "isRefreshing" to true,
                                    "refreshStartTime" to refreshStartTime.get(),
                                    "refreshType" to refreshType,
                                    "withRelations" to refreshWithRelations
                                )
                            )
                            return@post
                        }
                        
                        // Ustaw flagę, że odświeżanie jest w toku
                        if (isRefreshing.compareAndSet(false, true)) {
                            refreshStartTime.set(System.currentTimeMillis())
                            refreshType = "clear_posts"
                            refreshWithRelations = null
                        }
                        
                        try {
                            // Existing code for clearing posts
                        } finally {
                            // Reset the refresh state when done
                            isRefreshing.set(false)
                            refreshType = null
                            refreshWithRelations = null
                        }
                    } catch (e: Exception) {
                        // Reset the refresh state in case of error
                        isRefreshing.set(false)
                        refreshType = null
                        refreshWithRelations = null
                        
                        call.respond(
                            status = HttpStatusCode.InternalServerError,
                            message = hashMapOf(
                                "error" to e.message.toString()
                            )
                        )
                    }
                }
            }
        }
    }
} 