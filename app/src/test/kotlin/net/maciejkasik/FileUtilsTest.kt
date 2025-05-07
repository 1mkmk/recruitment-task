package net.maciejkasik

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Testy dla klasy FileUtils
 */
class FileUtilsTest {

    @TempDir
    lateinit var tempDir: Path
    
    private lateinit var config: AppConfig
    private lateinit var tempOutputDir: File
    
    @BeforeEach
    fun setUp() {
        tempOutputDir = File(tempDir.toFile(), "posts_test")
        tempOutputDir.mkdirs()
        
        // Ustawienie konfiguracji używającej tymczasowego katalogu testowego
        config = AppConfig(
            apiUrl = "https://jsonplaceholder.typicode.com",
            outputDirectory = tempOutputDir.absolutePath,
            serverPort = 8080,
            loggingEnabled = false
        )
    }
    
    @AfterEach
    fun tearDown() {
        tempOutputDir.deleteRecursively()
    }
    
    @Test
    fun `should save post as JSON file`() {
        // Arrange
        val post = Post(1, 10, "Test Title", "Test Body", "2025-05-06 10:00:00")
        
        // Act
        val result = FileUtils.savePostAsJson(post, tempOutputDir.absolutePath)
        
        // Assert
        assertTrue(result)
        
        val savedFile = File(tempOutputDir, "${post.id}.json")
        assertTrue(savedFile.exists())
        assertTrue(savedFile.isFile)
        
        val content = savedFile.readText()
        val json = Json { prettyPrint = true }
        assertTrue(content.contains("\"userId\": 1"))
        assertTrue(content.contains("\"id\": 10"))
        assertTrue(content.contains("\"title\": \"Test Title\""))
        assertTrue(content.contains("\"body\": \"Test Body\""))
    }
    
    @Test
    fun `should save post with relations as JSON file`() {
        // Arrange
        val user = User(1, "John Doe", "johndoe", "john@example.com")
        val comments = listOf(
            Comment(10, 1, "Comment 1", "user1@example.com", "This is comment 1"),
            Comment(10, 2, "Comment 2", "user2@example.com", "This is comment 2")
        )
        val postWithRelations = PostWithRelations(1, 10, "Test Title", "Test Body", user, comments, "2025-05-06 10:00:00")
        
        // Act
        val result = FileUtils.savePostWithRelationsAsJson(postWithRelations, tempOutputDir.absolutePath)
        
        // Assert
        assertTrue(result)
        
        val savedFile = File(tempOutputDir, "${postWithRelations.id}.json")
        assertTrue(savedFile.exists())
        assertTrue(savedFile.isFile)
        
        val content = savedFile.readText()
        assertTrue(content.contains("\"userId\": 1"))
        assertTrue(content.contains("\"id\": 10"))
        assertTrue(content.contains("\"name\": \"John Doe\""))
        assertTrue(content.contains("\"email\": \"john@example.com\""))
        assertTrue(content.contains("\"Comment 1\""))
        assertTrue(content.contains("\"Comment 2\""))
    }
    
    @Test
    fun `should list saved post files`() {
        // Arrange
        val post1 = Post(1, 1, "Title 1", "Body 1", "2025-05-06 10:00:00")
        val post2 = Post(1, 2, "Title 2", "Body 2", "2025-05-06 10:00:00")
        
        FileUtils.savePostAsJson(post1, tempOutputDir.absolutePath)
        FileUtils.savePostAsJson(post2, tempOutputDir.absolutePath)
        
        // Act
        val files = FileUtils.listPostFiles(tempOutputDir.absolutePath)
        
        // Assert
        assertEquals(2, files.size)
        assertTrue(files.any { it.name == "1.json" })
        assertTrue(files.any { it.name == "2.json" })
    }
    
    @Test
    fun `should read post from file`() {
        // Arrange
        val post = Post(1, 10, "Test Title", "Test Body", "2025-05-06 10:00:00")
        FileUtils.savePostAsJson(post, tempOutputDir.absolutePath)
        
        // Act
        val file = File(tempOutputDir, "${post.id}.json")
        val readPost = FileUtils.readPostFromFile(file)
        
        // Assert
        assertNotNull(readPost)
        assertEquals(post.userId, readPost?.userId)
        assertEquals(post.id, readPost?.id)
        assertEquals(post.title, readPost?.title)
        assertEquals(post.body, readPost?.body)
    }
    
    @Test
    fun `should clear directory`() {
        // Arrange
        val post1 = Post(1, 1, "Title 1", "Body 1", "2025-05-06 10:00:00")
        val post2 = Post(1, 2, "Title 2", "Body 2", "2025-05-06 10:00:00")
        
        FileUtils.savePostAsJson(post1, tempOutputDir.absolutePath)
        FileUtils.savePostAsJson(post2, tempOutputDir.absolutePath)
        
        // Verify files exist
        assertEquals(2, tempOutputDir.listFiles()?.size ?: 0)
        
        // Act
        val result = FileUtils.clearDirectory(tempOutputDir.absolutePath)
        
        // Assert
        assertTrue(result)
        assertEquals(0, tempOutputDir.listFiles()?.size ?: -1)
    }
    
    @Test
    fun `should handle non-existent directory when listing files`() {
        // Arrange
        val nonExistentDir = File(tempDir.toFile(), "non_existent")
        
        // Act
        val files = FileUtils.listPostFiles(nonExistentDir.absolutePath)
        
        // Assert
        assertEquals(0, files.size)
    }
    
    @Test
    fun `should create output directory if it does not exist`() {
        // Arrange
        val newDir = File(tempDir.toFile(), "new_dir")
        assertFalse(newDir.exists())
        
        val post = Post(1, 10, "Test Title", "Test Body", "2025-05-06 10:00:00")
        
        // Act
        val result = FileUtils.savePostAsJson(post, newDir.absolutePath)
        
        // Assert
        assertTrue(result)
        assertTrue(newDir.exists())
        assertTrue(newDir.isDirectory)
        
        val savedFile = File(newDir, "${post.id}.json")
        assertTrue(savedFile.exists())
    }
} 