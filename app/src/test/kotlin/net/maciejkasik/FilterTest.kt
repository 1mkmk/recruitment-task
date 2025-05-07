package net.maciejkasik

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json

/**
 * Testy dla mechanizmu filtrowania postów
 */
class FilterTest {

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
            // Endpoint for filtering posts
            get("/api/posts/filter") {
                val minId = call.request.queryParameters["minId"]?.toIntOrNull()
                val maxId = call.request.queryParameters["maxId"]?.toIntOrNull()
                val titleContains = call.request.queryParameters["titleContains"]
                val bodyContains = call.request.queryParameters["bodyContains"]
                
                // Przykładowe dane
                var posts = listOf(
                    Post(1, 1, "First Post", "This is first post body", "2025-05-06 10:00:00"),
                    Post(1, 2, "Second Post", "This is second post body", "2025-05-06 10:00:00"),
                    Post(2, 3, "Third Post", "This is third post body", "2025-05-06 10:00:00"),
                    Post(2, 4, "Fourth Post", "This is fourth post body", "2025-05-06 10:00:00"),
                    Post(3, 5, "Fifth Post", "This is fifth post body", "2025-05-06 10:00:00")
                )
                
                // Filtrowanie
                if (minId != null) {
                    posts = posts.filter { it.id >= minId }
                }
                
                if (maxId != null) {
                    posts = posts.filter { it.id <= maxId }
                }
                
                if (!titleContains.isNullOrBlank()) {
                    posts = posts.filter {
                        it.title.contains(titleContains, ignoreCase = true)
                    }
                }
                
                if (!bodyContains.isNullOrBlank()) {
                    posts = posts.filter {
                        it.body.contains(bodyContains, ignoreCase = true)
                    }
                }
                
                call.respond(posts)
            }
        }
    }
    
    @Test
    fun `should filter posts by minId`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?minId=3").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(3, posts.size)
            assertTrue(posts.all { it.id >= 3 })
        }
    }
    
    @Test
    fun `should filter posts by maxId`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?maxId=2").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(2, posts.size)
            assertTrue(posts.all { it.id <= 2 })
        }
    }
    
    @Test
    fun `should filter posts by title`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?titleContains=first").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(1, posts.size)
            assertEquals("First Post", posts[0].title)
        }
    }
    
    @Test
    fun `should filter posts by body`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?bodyContains=third").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(1, posts.size)
            assertEquals(3, posts[0].id)
        }
    }
    
    @Test
    fun `should combine multiple filters`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?minId=2&maxId=4&titleContains=post").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(3, posts.size)
            assertTrue(posts.all { it.id >= 2 && it.id <= 4 })
            assertTrue(posts.all { it.title.contains("post", ignoreCase = true) })
        }
    }
    
    @Test
    fun `should return empty list when no posts match filters`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?titleContains=nonexistent").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(0, posts.size)
        }
    }
    
    @Test
    fun `should filter case insensitively`() = testApplication {
        application {
            testModule()
        }
        
        val client = createClient()
        
        client.get("/api/posts/filter?titleContains=fIrSt").apply {
            assertEquals(HttpStatusCode.OK, status)
            val posts = body<List<Post>>()
            assertEquals(1, posts.size)
            assertEquals("First Post", posts[0].title)
        }
    }
} 