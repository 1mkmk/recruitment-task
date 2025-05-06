package net.maciejkasik

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Testy dla klasy Post i związanych z nią struktur danych
 */
class PostTest {

    @Test
    fun `should create Post object with correct properties`() {
        // Arrange
        val userId = 1
        val id = 10
        val title = "Test Title"
        val body = "Test Body"
        val fetchDate = "2025-05-06 10:00:00"
        
        // Act
        val post = Post(userId, id, title, body, fetchDate)
        
        // Assert
        assertEquals(userId, post.userId)
        assertEquals(id, post.id)
        assertEquals(title, post.title)
        assertEquals(body, post.body)
        assertEquals(fetchDate, post.fetchDate)
    }
    
    @Test
    fun `should serialize Post to JSON correctly`() {
        // Arrange
        val post = Post(1, 10, "Test Title", "Test Body", "2025-05-06 10:00:00")
        
        // Act
        val json = Json.encodeToString(post)
        
        // Assert
        assertTrue(json.contains("\"userId\":1"))
        assertTrue(json.contains("\"id\":10"))
        assertTrue(json.contains("\"title\":\"Test Title\""))
        assertTrue(json.contains("\"body\":\"Test Body\""))
        assertTrue(json.contains("\"fetchDate\":\"2025-05-06 10:00:00\""))
    }
    
    @Test
    fun `should deserialize JSON to Post correctly`() {
        // Arrange
        val jsonString = """
            {
                "userId": 1,
                "id": 10,
                "title": "Test Title",
                "body": "Test Body",
                "fetchDate": "2025-05-06 10:00:00"
            }
        """.trimIndent()
        
        // Act
        val post = Json.decodeFromString<Post>(jsonString)
        
        // Assert
        assertEquals(1, post.userId)
        assertEquals(10, post.id)
        assertEquals("Test Title", post.title)
        assertEquals("Test Body", post.body)
        assertEquals("2025-05-06 10:00:00", post.fetchDate)
    }
    
    @Test
    fun `should deserialize JSON without fetchDate correctly`() {
        // Arrange
        val jsonString = """
            {
                "userId": 1,
                "id": 10,
                "title": "Test Title",
                "body": "Test Body"
            }
        """.trimIndent()
        
        // Act
        val post = Json.decodeFromString<Post>(jsonString)
        
        // Assert
        assertEquals(1, post.userId)
        assertEquals(10, post.id)
        assertEquals("Test Title", post.title)
        assertEquals("Test Body", post.body)
        assertNull(post.fetchDate)
    }
    
    @Test
    fun `should create PostWithRelations object with relations`() {
        // Arrange
        val user = User(1, "John Doe", "johndoe", "john@example.com")
        val comments = listOf(
            Comment(10, 1, "Comment 1", "user1@example.com", "This is comment 1"),
            Comment(10, 2, "Comment 2", "user2@example.com", "This is comment 2")
        )
        
        // Act
        val postWithRelations = PostWithRelations(1, 10, "Test Title", "Test Body", user, comments, "2025-05-06 10:00:00")
        
        // Assert
        assertEquals(1, postWithRelations.userId)
        assertEquals(10, postWithRelations.id)
        assertEquals("Test Title", postWithRelations.title)
        assertEquals("Test Body", postWithRelations.body)
        assertEquals("2025-05-06 10:00:00", postWithRelations.fetchDate)
        assertEquals(user, postWithRelations.user)
        assertEquals(comments, postWithRelations.comments)
        assertEquals(2, postWithRelations.comments?.size)
    }
    
    @Test
    fun `should serialize and deserialize PostWithRelations correctly`() {
        // Arrange
        val user = User(1, "John Doe", "johndoe", "john@example.com")
        val comments = listOf(
            Comment(10, 1, "Comment 1", "user1@example.com", "This is comment 1"),
            Comment(10, 2, "Comment 2", "user2@example.com", "This is comment 2")
        )
        val postWithRelations = PostWithRelations(1, 10, "Test Title", "Test Body", user, comments, "2025-05-06 10:00:00")
        
        // Act
        val json = Json.encodeToString(postWithRelations)
        val decoded = Json.decodeFromString<PostWithRelations>(json)
        
        // Assert
        assertEquals(postWithRelations.userId, decoded.userId)
        assertEquals(postWithRelations.id, decoded.id)
        assertEquals(postWithRelations.title, decoded.title)
        assertEquals(postWithRelations.body, decoded.body)
        assertEquals(postWithRelations.fetchDate, decoded.fetchDate)
        assertEquals(postWithRelations.user?.name, decoded.user?.name)
        assertEquals(postWithRelations.user?.email, decoded.user?.email)
        assertEquals(postWithRelations.comments?.size, decoded.comments?.size)
    }
} 