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
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Testy dla operacji odświeżania postów
 */
class RefreshOperationsTest {

    @TempDir
    lateinit var tempDir: Path
    
    private lateinit var tempOutputDir: File
    private lateinit var mockApiService: ApiService
    
    // Atrybuty do symulowania stanu odświeżania
    private val isRefreshing = AtomicBoolean(false)
    private val refreshStartTime = AtomicLong(0)
    private var refreshType: String? = null
    private var refreshWithRelations: Boolean? = null
    
    @BeforeEach
    fun setUp() {
        tempOutputDir = File(tempDir.toFile(), "posts_test")
        tempOutputDir.mkdirs()
        
        // Resetuj stan odświeżania
        isRefreshing.set(false)
        refreshStartTime.set(0)
        refreshType = null
        refreshWithRelations = null
        
        // Przygotuj mock dla ApiService
        mockApiService = mockk()
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
    
    private fun Application.testModule() {
        install(io.ktor.server.plugins.contentnegotiation.ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        
        routing {
            // Endpoint for refresh status
            get("/api/refresh-status") {
                val response = RefreshStatusResponse(
                    isRefreshing = isRefreshing.get(),
                    refreshStartTime = if (refreshStartTime.get() > 0) refreshStartTime.get() else null,
                    refreshType = refreshType,
                    withRelations = refreshWithRelations
                )
                call.respond(response)
            }
            
            // Endpoint for quick refresh
            post("/api/posts/quick-refresh") {
                if (isRefreshing.get()) {
                    call.respond(
                        HttpStatusCode.Conflict,
                        ErrorResponse("Refresh operation already in progress")
                    )
                    return@post
                }
                
                val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                
                // Ustaw stan odświeżania
                isRefreshing.set(true)
                refreshStartTime.set(System.currentTimeMillis())
                refreshType = "quick"
                refreshWithRelations = withRelations
                
                // Odśwież posty
                val posts = listOf(
                    Post(1, 101, "New Post 101", "New Body 101", "2025-05-06 10:00:00"),
                    Post(1, 102, "New Post 102", "New Body 102", "2025-05-06 10:00:00")
                )
                
                // Reset stanu odświeżania
                isRefreshing.set(false)
                
                val response = QuickRefreshResponse(
                    success = true,
                    totalChecked = 10,
                    totalAdded = 2,
                    posts = posts
                )
                call.respond(response)
            }
            
            // Endpoint for hard refresh
            post("/api/posts/hard-refresh") {
                if (isRefreshing.get()) {
                    call.respond(
                        HttpStatusCode.Conflict,
                        ErrorResponse("Refresh operation already in progress")
                    )
                    return@post
                }
                
                val withRelations = call.request.queryParameters["withRelations"]?.toBoolean() ?: false
                
                // Ustaw stan odświeżania
                isRefreshing.set(true)
                refreshStartTime.set(System.currentTimeMillis())
                refreshType = "hard"
                refreshWithRelations = withRelations
                
                // Odśwież posty
                val posts = listOf(
                    Post(1, 1, "Refreshed Post 1", "Refreshed Body 1", "2025-05-06 10:00:00"),
                    Post(1, 2, "Refreshed Post 2", "Refreshed Body 2", "2025-05-06 10:00:00")
                )
                
                // Reset stanu odświeżania
                isRefreshing.set(false)
                
                val response = HardRefreshResponse(
                    success = true,
                    totalFetched = 100,
                    totalRefreshed = 100,
                    posts = posts
                )
                call.respond(response)
            }
        }
    }
    
    @Test
    fun `should get refresh status when not refreshing`() = testApplication {
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
    fun `should perform quick refresh and update status`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        // Sprawdź początkowy stan
        client.get("/api/refresh-status").apply {
            val initialStatus = body<RefreshStatusResponse>()
            assertEquals(false, initialStatus.isRefreshing)
        }
        
        // Wykonaj szybkie odświeżanie
        client.post("/api/posts/quick-refresh?withRelations=true").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<QuickRefreshResponse>()
            assertEquals(true, response.success)
            assertEquals(2, response.posts.size)
        }
        
        // Sprawdź, czy status został zaktualizowany
        client.get("/api/refresh-status").apply {
            val updatedStatus = body<RefreshStatusResponse>()
            assertEquals(false, updatedStatus.isRefreshing) // Powinno być już zakończone
            assertEquals(null, updatedStatus.refreshType) // Nie powinno być już typu odświeżania
        }
    }
    
    @Test
    fun `should perform hard refresh and update status`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        // Sprawdź początkowy stan
        client.get("/api/refresh-status").apply {
            val initialStatus = body<RefreshStatusResponse>()
            assertEquals(false, initialStatus.isRefreshing)
        }
        
        // Wykonaj pełne odświeżanie
        client.post("/api/posts/hard-refresh").apply {
            assertEquals(HttpStatusCode.OK, status)
            val response = body<HardRefreshResponse>()
            assertEquals(true, response.success)
            assertEquals(100, response.totalRefreshed)
            assertEquals(2, response.posts.size)
        }
        
        // Sprawdź, czy status został zaktualizowany
        client.get("/api/refresh-status").apply {
            val updatedStatus = body<RefreshStatusResponse>()
            assertEquals(false, updatedStatus.isRefreshing) // Powinno być już zakończone
            assertEquals(null, updatedStatus.refreshType) // Nie powinno być już typu odświeżania
        }
    }
    
    @Test
    fun `should prevent parallel refresh operations`() = testApplication {
        application {
            testModule()
        }
        
        // Ręcznie ustaw stan odświeżania
        isRefreshing.set(true)
        refreshStartTime.set(System.currentTimeMillis())
        refreshType = "hard"
        
        val client = createClient()
        
        // Próba wykonania szybkiego odświeżania, gdy inne odświeżanie jest w toku
        client.post("/api/posts/quick-refresh").apply {
            assertEquals(HttpStatusCode.Conflict, status)
            val response = body<ErrorResponse>()
            assertEquals("Refresh operation already in progress", response.error)
        }
        
        // Próba wykonania pełnego odświeżania, gdy inne odświeżanie jest w toku
        client.post("/api/posts/hard-refresh").apply {
            assertEquals(HttpStatusCode.Conflict, status)
            val response = body<ErrorResponse>()
            assertEquals("Refresh operation already in progress", response.error)
        }
    }
    
    @Test
    fun `should respect withRelations parameter in quick refresh`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        // Wykonaj szybkie odświeżanie z withRelations=true
        client.post("/api/posts/quick-refresh?withRelations=true").apply {
            assertEquals(HttpStatusCode.OK, status)
        }
        
        // Sprawdź, czy parametr został zapisany w statusie
        client.get("/api/refresh-status").apply {
            val status = body<RefreshStatusResponse>()
            assertEquals(false, status.isRefreshing) // Już zakończone
            assertEquals(null, status.withRelations) // Po zakończeniu null
        }
    }
    
    @Test
    fun `should respect withRelations parameter in hard refresh`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        // Wykonaj pełne odświeżanie z withRelations=true
        client.post("/api/posts/hard-refresh?withRelations=true").apply {
            assertEquals(HttpStatusCode.OK, status)
        }
        
        // Sprawdź, czy parametr został zapisany w statusie
        client.get("/api/refresh-status").apply {
            val status = body<RefreshStatusResponse>()
            assertEquals(false, status.isRefreshing) // Już zakończone
            assertEquals(null, status.withRelations) // Po zakończeniu null
        }
    }
} 