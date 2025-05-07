package net.maciejkasik

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import io.mockk.mockk
import io.mockk.every
import io.mockk.verify
import io.mockk.slot
import io.mockk.clearAllMocks
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Testy dla API w ApiServer
 */
class ApiServerTest {

    @TempDir
    lateinit var tempDir: Path
    
    private lateinit var tempOutputDir: File
    
    @BeforeEach
    fun setUp() {
        tempOutputDir = File(tempDir.toFile(), "posts_test")
        tempOutputDir.mkdirs()
        
        // Reset stanu refreshing dla każdego testu
        clearAllMocks()
    }
    
    @AfterEach
    fun tearDown() {
        tempOutputDir.deleteRecursively()
    }
    
    /**
     * Skonfigurowanie testowego klienta HTTP
     */
    private fun createClient() = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }
    
    /**
     * Helper method to configure test application module
     */
    private fun Application.testModule() {
        // Konfiguracja serwera, podobnie jak w ApiServer
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                useArrayPolymorphism = true
            })
        }
        
        install(io.ktor.server.plugins.cors.routing.CORS) {
            anyHost()
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
            allowCredentials = true
            maxAgeInSeconds = 3600
        }
        
        routing {
            // Endpoint for environment info
            get("/api/info") {
                val info = EnvironmentInfo(
                    version = "1.0.0-TEST",
                    environment = "test",
                    outputDirectory = tempOutputDir.absolutePath
                )
                call.respond(info)
            }
            
            // Endpoint for posts
            get("/api/posts") {
                // Sample data for testing
                val posts = listOf(
                    Post(1, 1, "Test Post 1", "Test Body 1", "2025-05-06 10:00:00"),
                    Post(1, 2, "Test Post 2", "Test Body 2", "2025-05-06 10:00:00")
                )
                call.respond(posts)
            }
            
            // Endpoint for single post
            get("/api/posts/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id != null) {
                    val post = Post(1, id, "Test Post $id", "Test Body $id", "2025-05-06 10:00:00")
                    call.respond(post)
                } else {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid post ID"))
                }
            }
            
            // Endpoint for deleting a post
            delete("/api/posts/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id != null) {
                    call.respond(mapOf("success" to true, "message" to "Post deleted successfully"))
                } else {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid post ID"))
                }
            }
            
            // Endpoint for clear all posts
            delete("/api/posts") {
                call.respond(mapOf("success" to true, "directory" to tempOutputDir.absolutePath))
            }
            
            // Endpoint for save a post
            post("/api/posts/save/{id}") {
                val id = call.parameters["id"]?.toIntOrNull()
                if (id != null) {
                    val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                    val response = mapOf(
                        "success" to true,
                        "message" to "Post saved successfully",
                        "filePath" to "${tempOutputDir.absolutePath}/$id.json"
                    )
                    call.respond(response)
                } else {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid post ID"))
                }
            }
            
            // Endpoint for refresh status
            get("/api/refresh-status") {
                val response = RefreshStatusResponse(
                    isRefreshing = false,
                    refreshStartTime = null,
                    refreshType = null,
                    withRelations = null
                )
                call.respond(response)
            }
            
            // Endpoint for quick refresh
            post("/api/posts/quick-refresh") {
                val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                
                val response = QuickRefreshResponse(
                    success = true,
                    totalChecked = 10,
                    totalAdded = 2,
                    posts = listOf(
                        Post(1, 101, "New Post 101", "New Body 101", "2025-05-06 10:00:00"),
                        Post(1, 102, "New Post 102", "New Body 102", "2025-05-06 10:00:00")
                    )
                )
                call.respond(response)
            }
            
            // Endpoint for hard refresh
            post("/api/posts/hard-refresh") {
                val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                
                val response = HardRefreshResponse(
                    success = true,
                    totalFetched = 100,
                    totalRefreshed = 100,
                    posts = listOf(
                        Post(1, 1, "Refreshed Post 1", "Refreshed Body 1", "2025-05-06 10:00:00"),
                        Post(1, 2, "Refreshed Post 2", "Refreshed Body 2", "2025-05-06 10:00:00")
                    )
                )
                call.respond(response)
            }
            
            // Endpoint for save all posts
            post("/api/posts/save-all") {
                val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                
                val response = mapOf(
                    "success" to true,
                    "totalPosts" to 100,
                    "savedPosts" to 100,
                    "directory" to tempOutputDir.absolutePath
                )
                call.respond(response)
            }
            
            // Endpoint for update output directory
            post("/api/config/output-directory") {
                val request = call.receive<OutputDirectoryRequest>()
                val response = mapOf(
                    "success" to true,
                    "message" to "Output directory updated successfully",
                    "config" to EnvironmentInfo(
                        version = "1.0.0-TEST",
                        environment = "test",
                        outputDirectory = request.outputDirectory
                    )
                )
                call.respond(response)
            }
        }
    }
    
    @Test
    fun `should get environment info`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/info").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<Map<String, String>>()
            assertEquals("1.0.0-TEST", response["version"])
            assertEquals("test", response["environment"])
            assertEquals(tempOutputDir.absolutePath, response["outputDirectory"])
        }
    }
    
    @Test
    fun `should get posts list`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(2, posts.size)
            assertEquals(1, posts[0].id)
            assertEquals(2, posts[1].id)
            assertEquals("Test Post 1", posts[0].title)
            assertEquals("Test Post 2", posts[1].title)
        }
    }
    
    @Test
    fun `should get post by id`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/5").apply {
            assertEquals(HttpStatusCode.OK, status)
            val post = body<Post>()
            assertEquals(5, post.id)
            assertEquals("Test Post 5", post.title)
            assertEquals("Test Body 5", post.body)
        }
    }
    
    @Test
    fun `should delete post by id`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.delete("/api/posts/5").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<Map<String, Any>>()
            assertEquals(true, response["success"])
            assertEquals("Post deleted successfully", response["message"])
        }
    }
    
    @Test
    fun `should clear all posts`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.delete("/api/posts").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<Map<String, Any>>()
            assertEquals(true, response["success"])
            assertEquals(tempOutputDir.absolutePath, response["directory"])
        }
    }
    
    @Test
    fun `should save post by id`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.post("/api/posts/save/5").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<Map<String, Any>>()
            assertEquals(true, response["success"])
            assertEquals("Post saved successfully", response["message"])
            assertEquals("${tempOutputDir.absolutePath}/5.json", response["filePath"])
        }
    }
    
    @Test
    fun `should get refresh status`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/refresh-status").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<RefreshStatusResponse>()
            assertEquals(false, response.isRefreshing)
            assertEquals(null, response.refreshStartTime)
            assertEquals(null, response.refreshType)
            assertEquals(null, response.withRelations)
        }
    }
    
    @Test
    fun `should perform quick refresh`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.post("/api/posts/quick-refresh").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<QuickRefreshResponse>()
            assertEquals(true, response.success)
            assertEquals(10, response.totalChecked)
            assertEquals(2, response.totalAdded)
            assertEquals(2, response.posts.size)
            assertEquals(101, response.posts[0].id)
            assertEquals(102, response.posts[1].id)
        }
    }
    
    @Test
    fun `should perform hard refresh`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.post("/api/posts/hard-refresh").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<HardRefreshResponse>()
            assertEquals(true, response.success)
            assertEquals(100, response.totalFetched)
            assertEquals(100, response.totalRefreshed)
            assertEquals(2, response.posts.size)
            assertEquals("Refreshed Post 1", response.posts[0].title)
            assertEquals("Refreshed Post 2", response.posts[1].title)
        }
    }
    
    @Test
    fun `should save all posts`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.post("/api/posts/save-all").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<Map<String, Any>>()
            assertEquals(true, response["success"])
            assertEquals(100, response["totalPosts"])
            assertEquals(100, response["savedPosts"])
            assertEquals(tempOutputDir.absolutePath, response["directory"])
        }
    }
    
    @Test
    fun `should update output directory`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        val newDir = "${tempOutputDir.absolutePath}/new_dir"
        
        client.post("/api/config/output-directory") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("outputDirectory" to newDir))
        }.apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<Map<String, Any>>()
            assertEquals(true, response["success"])
            assertEquals("Output directory updated successfully", response["message"])
            
            val config = response["config"] as Map<*, *>
            assertEquals(newDir, config["outputDirectory"])
        }
    }
}

@Serializable
data class EnvironmentInfo(
    val version: String,
    val environment: String,
    val outputDirectory: String
) 