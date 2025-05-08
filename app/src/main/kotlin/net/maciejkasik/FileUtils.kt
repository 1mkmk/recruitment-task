package net.maciejkasik

import com.google.gson.GsonBuilder
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.Paths
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.decodeFromString
import org.slf4j.LoggerFactory
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Utility class for file operations
 */
object FileUtils {
    private val logger = LoggerFactory.getLogger(FileUtils::class.java)
    
    // Ustawienie opcji Json do deserializacji - bardzo ważne dla relacji
    private val json = Json { 
        prettyPrint = true 
        isLenient = true
        encodeDefaults = true
        ignoreUnknownKeys = true
        coerceInputValues = true
        useArrayPolymorphism = true
    }
    
    private val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
    
    /**
     * Zapisuje post w formacie JSON
     */
    fun savePostAsJson(post: Post): Boolean {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        // Add current date and time to the post
        val currentDateTime = LocalDateTime.now().format(dateTimeFormatter)
        val postWithDate = post.copy(fetchDate = currentDateTime)
        return saveToFile(postWithDate, "${config.outputDirectory}/${post.id}.json")
    }
    
    /**
     * Zapisuje post z relacjami w formacie JSON
     */
    fun savePostWithRelationsAsJson(post: PostWithRelations): Boolean {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        // Add current date and time to the post
        val currentDateTime = LocalDateTime.now().format(dateTimeFormatter)
        val postWithDate = post.copy(fetchDate = currentDateTime)
        return saveToFile(postWithDate, "${config.outputDirectory}/${post.id}.json")
    }
    
    /**
     * Generyczna funkcja zapisująca obiekt do pliku JSON
     */
    private inline fun <reified T> saveToFile(data: T, filePath: String): Boolean {
        try {
            val file = File(filePath)
            val directory = file.parentFile
            
            if (!directory.exists()) {
                directory.mkdirs()
            }
            
            val jsonString = json.encodeToString(data)
            file.writeText(jsonString)
            
            logger.info("Zapisano plik JSON: $filePath")
            return true
        } catch (e: Exception) {
            logger.error("Błąd podczas zapisywania pliku JSON: ${e.message}")
            return false
        }
    }
    
    /**
     * Tworzy plik ZIP zawierający pliki JSON z katalogu wyjściowego
     *
     * @param postIds Lista ID postów do zawarcia w pliku ZIP (jeśli null, wszystkie posty są dołączane)
     * @return Ścieżka do utworzonego pliku ZIP lub null w przypadku błędu
     */
    fun createPostsZipFile(postIds: List<Int>? = null): String? {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        val sourceDir = File(config.outputDirectory)
        
        if (!sourceDir.exists() || !sourceDir.isDirectory) {
            logger.error("Katalog wyjściowy nie istnieje: ${config.outputDirectory}")
            return null
        }
        
        val zipFileName = "posts_${LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"))}.zip"
        val zipFilePath = "${config.outputDirectory}/$zipFileName"
        
        return try {
            val zipFile = File(zipFilePath)
            val zipOut = ZipOutputStream(FileOutputStream(zipFile))
            
            // Get JSON files based on filter criteria
            val jsonFiles = if (postIds != null && postIds.isNotEmpty()) {
                // Filter files by specified post IDs
                sourceDir.listFiles { file -> 
                    file.isFile && file.name.endsWith(".json") && 
                    file.nameWithoutExtension.toIntOrNull()?.let { id -> postIds.contains(id) } ?: false 
                } ?: emptyArray()
            } else {
                // Get all JSON files
                sourceDir.listFiles { file -> 
                    file.isFile && file.name.endsWith(".json") 
                } ?: emptyArray()
            }
            
            if (jsonFiles.isEmpty()) {
                logger.warn("Brak plików JSON spełniających kryteria w katalogu: ${config.outputDirectory}")
                zipOut.close()
                zipFile.delete() // Delete empty zip file
                return null
            }
            
            // Add each JSON file to the ZIP
            jsonFiles.forEach { file ->
                try {
                    val fileInput = FileInputStream(file)
                    val zipEntry = ZipEntry(file.name)
                    
                    zipOut.putNextEntry(zipEntry)
                    val bytes = ByteArray(1024)
                    var length: Int
                    
                    while (fileInput.read(bytes).also { length = it } >= 0) {
                        zipOut.write(bytes, 0, length)
                    }
                    
                    fileInput.close()
                    zipOut.closeEntry()
                } catch (e: Exception) {
                    logger.error("Błąd podczas dodawania pliku ${file.name} do ZIP: ${e.message}")
                    throw e
                }
            }
            
            zipOut.close()
            logger.info("Utworzono plik ZIP: $zipFilePath (zawiera ${jsonFiles.size} plików)")
            zipFilePath
        } catch (e: Exception) {
            logger.error("Błąd podczas tworzenia pliku ZIP: ${e.message}")
            e.printStackTrace()
            // Try to delete the zip file if it was created but failed
            try {
                File(zipFilePath).delete()
            } catch (deleteError: Exception) {
                logger.error("Błąd podczas usuwania niekompletnego pliku ZIP: ${deleteError.message}")
            }
            null
        }
    }
    
    /**
     * Czyści katalog wyjściowy
     *
     * @param directory Katalog do wyczyszczenia (opcjonalnie, domyślnie z konfiguracji)
     * @return true jeśli operacja się powiodła, false w przeciwnym razie
     */
    fun clearOutputDirectory(directory: String? = null): Boolean {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        val outputDir = directory ?: config.outputDirectory
        
        return try {
            val dir = File(outputDir)
            var deletedCount = 0
            
            if (dir.exists()) {
                dir.listFiles()?.forEach { file ->
                    if (file.isFile && file.name.endsWith(".json")) {
                        val success = file.delete()
                        if (success) {
                            deletedCount++
                            logger.info("Usunięto plik: ${file.absolutePath}")
                        } else {
                            logger.warn("Nie udało się usunąć pliku: ${file.absolutePath}")
                        }
                    }
                }
                logger.info("Wyczyszczono katalog wyjściowy: $outputDir (usunięto $deletedCount plików)")
            } else {
                dir.mkdirs()
                logger.info("Utworzono katalog wyjściowy: $outputDir")
            }
            true
        } catch (e: Exception) {
            logger.error("Błąd podczas czyszczenia katalogu wyjściowego: ${e.message}")
            e.printStackTrace()
            false
        }
    }
    
    /**
     * Zwraca listę zapisanych postów
     *
     * @return Lista obiektów Post odczytanych z plików JSON
     */
    fun listSavedPosts(): List<Post> {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        val dir = File(config.outputDirectory)
        val posts = mutableListOf<Post>()
        
        if (dir.exists() && dir.isDirectory) {
            dir.listFiles()?.forEach { file ->
                if (file.isFile && file.name.endsWith(".json")) {
                    try {
                        // Próba odczytania pliku jako PostWithRelations
                        val jsonContent = file.readText()
                        
                        // Sprawdź, czy plik zawiera relacje
                        try {
                            val postWithRelations = json.decodeFromString<PostWithRelations>(jsonContent)
                            posts.add(Post(
                                id = postWithRelations.id,
                                userId = postWithRelations.userId,
                                title = postWithRelations.title,
                                body = postWithRelations.body,
                                fetchDate = postWithRelations.fetchDate
                            ))
                        } catch (e: Exception) {
                            // Jeśli nie udało się odczytać jako PostWithRelations, spróbuj jako Post
                            try {
                                val post = json.decodeFromString<Post>(jsonContent)
                                posts.add(post)
                            } catch (e2: Exception) {
                                logger.error("Błąd podczas odczytywania pliku ${file.name}: ${e2.message}")
                            }
                        }
                    } catch (e: Exception) {
                        logger.error("Błąd podczas odczytywania pliku ${file.name}: ${e.message}")
                    }
                }
            }
        }
        
        return posts
    }
    
    /**
     * Zwraca listę zapisanych plików JSON
     *
     * @return Lista plików JSON w katalogu wyjściowym
     */
    fun listJsonFiles(): List<File> {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        val dir = File(config.outputDirectory)
        val files = mutableListOf<File>()
        
        if (dir.exists() && dir.isDirectory) {
            dir.listFiles()?.forEach { file ->
                if (file.isFile && file.name.endsWith(".json")) {
                    files.add(file)
                }
            }
        }
        
        return files
    }
    
    /**
     * Odczytuje post (z relacjami lub bez) z pliku JSON
     *
     * @param id ID postu
     * @return Obiekt Post lub null, jeśli nie znaleziono pliku lub wystąpił błąd
     */
    fun readPost(id: Int): Post? {
        val filePath = getPostFilePath(id)
        val file = File(filePath)
        
        if (!file.exists() || !file.isFile) {
            logger.warn("Plik nie istnieje: $filePath")
            return null
        }
        
        try {
            val jsonContent = file.readText()
            
            // Najpierw próbujemy odczytać jako PostWithRelations
            try {
                val postWithRelations = json.decodeFromString<PostWithRelations>(jsonContent)
                return Post(
                    id = postWithRelations.id,
                    userId = postWithRelations.userId,
                    title = postWithRelations.title,
                    body = postWithRelations.body,
                    fetchDate = postWithRelations.fetchDate
                )
            } catch (e: Exception) {
                // Jeśli nie udało się jako PostWithRelations, próbujemy jako zwykły Post
                try {
                    return json.decodeFromString<Post>(jsonContent)
                } catch (e2: Exception) {
                    logger.error("Błąd podczas odczytywania postu $id: ${e2.message}")
                    return null
                }
            }
        } catch (e: Exception) {
            logger.error("Błąd podczas odczytywania pliku $filePath: ${e.message}")
            return null
        }
    }
    
    /**
     * Zwraca ścieżkę do pliku z postem o podanym ID
     *
     * @param postId ID postu
     * @return Pełna ścieżka do pliku z postem
     */
    fun getPostFilePath(postId: Int): String {
        val config = ConfigProvider.getConfig(Environment.getCurrent())
        return "${config.outputDirectory}/$postId.json"
    }
    
    /**
     * Usuwa plik o podanej ścieżce
     *
     * @param filePath Ścieżka do usuwanego pliku
     * @return true jeśli operacja się powiodła, false w przeciwnym razie
     */
    fun deleteFile(filePath: String): Boolean {
        return try {
            val file = File(filePath)
            if (file.exists() && file.isFile) {
                val result = file.delete()
                if (result) {
                    logger.info("Usunięto plik: $filePath")
                } else {
                    logger.warn("Nie udało się usunąć pliku: $filePath")
                }
                result
            } else {
                logger.warn("Plik nie istnieje: $filePath")
                false
            }
        } catch (e: Exception) {
            logger.error("Błąd podczas usuwania pliku $filePath: ${e.message}")
            false
        }
    }
    
    /**
     * Sprawdza, czy plik JSON zawiera post z relacjami czy bez
     *
     * @param file Plik JSON do sprawdzenia
     * @return Para (czy plik zawiera post z relacjami, informacje o pliku)
     */
    fun checkPostFileType(file: File): Pair<Boolean, String> {
        try {
            // Zamiast parseToJsonElement, użyjemy alternatywnego podejścia
            val jsonContent = file.readText()
            
            // Sprawdzamy, czy zawiera słowa kluczowe wskazujące na relacje
            val hasUser = jsonContent.contains("\"user\":")
            val hasComments = jsonContent.contains("\"comments\":")
            
            val hasRelations = hasUser || hasComments
            
            // Próba odczytania tytułu przez dekodowanie całego obiektu
            val title = try {
                // Najpierw spróbuj odczytać jako PostWithRelations
                try {
                    val postWithRelations = json.decodeFromString<PostWithRelations>(jsonContent)
                    postWithRelations.title
                } catch (e: Exception) {
                    // Jeśli nie zadziała, spróbuj jako zwykły Post
                    val post = json.decodeFromString<Post>(jsonContent)
                    post.title
                }
            } catch (e: Exception) {
                "Brak tytułu"
            }
            
            return Pair(hasRelations, title)
        } catch (e: Exception) {
            logger.error("Błąd podczas sprawdzania typu pliku ${file.name}: ${e.message}")
            return Pair(false, "Błąd odczytu")
        }
    }
}