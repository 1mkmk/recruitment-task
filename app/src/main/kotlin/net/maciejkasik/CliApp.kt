package net.maciejkasik

import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.system.exitProcess

/**
 * Dedicated CLI application for managing posts
 */
fun main(args: Array<String>) {
    val cli = CliApp()
    cli.run(args)
}

class CliApp {
    private var currentEnv = Environment.DEVELOPMENT
    private var currentConfig = ConfigProvider.getConfig(currentEnv)
    private var withRelations = false

    fun run(args: Array<String>) {
        if (args.isEmpty()) {
            printHelp()
            return
        }

        when (args[0].lowercase()) {
            // Nowe API-zgodne komendy
            "posts" -> {
                if (args.size > 1) {
                    // Jeśli podano ID, wyświetl konkretny zapisany post
                    getSavedPost(args[1])
                } else {
                    // Jeśli nie podano ID, wyświetl wszystkie zapisane posty
                    listJsonFilesDetailed()
                }
            }
            "save-all" -> savePosts(emptyList())
            "save-all-with-relations" -> savePostsWithRelations()
            "saved-posts" -> listPosts()
            "delete" -> deletePost(args.drop(1))
            "quick-refresh" -> quickRefresh()
            "hard-refresh" -> hardRefresh()
            "filter" -> filterPosts(args.drop(1))
            "export-zip" -> exportAsZip(args.drop(1))
            "toggle-relations" -> toggleRelations(args.drop(1))
            
            // Zachowaj kompatybilność wstecz
            "fetch" -> fetchPosts(args.drop(1))
            "save" -> savePosts(args.drop(1))
            "list" -> listPosts()
            "get" -> getPost(args.drop(1))
            "clear" -> clearPosts()
            "env" -> setEnvironment(args.drop(1))
            "help", "--help", "-h" -> printHelp()
            else -> {
                println("Nieznana komenda: ${args[0]}")
                printHelp()
            }
        }
    }

    // Zmodyfikowana funkcja do wyświetlania szczegółów zapisanego postu
    private fun getSavedPost(idStr: String) {
        val id = idStr.toIntOrNull()
        if (id == null) {
            println("Nieprawidłowe ID postu")
            return
        }

        val filePath = FileUtils.getPostFilePath(id)
        val file = File(filePath)
        
        if (!file.exists()) {
            println("Nie znaleziono zapisanego postu o ID $id")
            return
        }
        
        try {
            val jsonContent = file.readText()
            
            // Wykrywamy, czy plik zawiera relacje
            val hasUser = jsonContent.contains("\"user\":")
            val hasComments = jsonContent.contains("\"comments\":")
            
            // Próbujemy odczytać post jako PostWithRelations, jeśli zawiera relacje
            if (hasUser || hasComments) {
                try {
                    val postWithRelations = Json.decodeFromString<PostWithRelations>(jsonContent)
                    println("""
                        Post #${postWithRelations.id}
                        Tytuł: ${postWithRelations.title}
                        Autor ID: ${postWithRelations.userId}
                        Treść: ${postWithRelations.body}
                        ${if (postWithRelations.fetchDate != null) "Data pobrania: ${postWithRelations.fetchDate}" else ""}
                    """.trimIndent())
                    
                    // Wyświetl informacje o użytkowniku, jeśli są dostępne
                    if (postWithRelations.user != null) {
                        val user = postWithRelations.user
                        println("""
                            
                            Informacje o użytkowniku:
                            ID: ${user.id}
                            Nazwa: ${user.name}
                            Nazwa użytkownika: ${user.username}
                            Email: ${user.email}
                            Telefon: ${user.phone}
                            Strona: ${user.website}
                            Adres: ${user.address?.street ?: "N/A"}, ${user.address?.suite ?: "N/A"}, ${user.address?.city ?: "N/A"}, ${user.address?.zipcode ?: "N/A"}
                            Firma: ${user.company?.name ?: "N/A"} - ${user.company?.catchPhrase ?: "N/A"}
                        """.trimIndent())
                    }
                    
                    // Wyświetl komentarze, jeśli są dostępne
                    if (postWithRelations.comments != null && postWithRelations.comments.isNotEmpty()) {
                        println("\nKomentarze (${postWithRelations.comments.size}):")
                        postWithRelations.comments.forEachIndexed { index, comment ->
                            println("""
                                ${index + 1}. Od: ${comment.name} <${comment.email}>
                                   ${comment.body.replace("\n", "\n   ")}
                            """.trimIndent())
                        }
                    }
                } catch (e: Exception) {
                    // Jeśli nie uda się odczytać jako PostWithRelations, odczytaj jako zwykły Post
                    readAndDisplaySimplePost(jsonContent)
                }
            } else {
                // Odczytaj jako zwykły Post
                readAndDisplaySimplePost(jsonContent)
            }
        } catch (e: Exception) {
            println("Błąd podczas odczytywania postu: ${e.message}")
        }
    }
    
    // Pomocnicza funkcja do odczytywania i wyświetlania zwykłego postu (bez relacji)
    private fun readAndDisplaySimplePost(jsonContent: String) {
        try {
            val post = Json.decodeFromString<Post>(jsonContent)
            println("""
                Post #${post.id}
                Tytuł: ${post.title}
                Autor ID: ${post.userId}
                Treść: ${post.body}
                ${if (post.fetchDate != null) "Data pobrania: ${post.fetchDate}" else ""}
            """.trimIndent())
        } catch (e: Exception) {
            println("Błąd podczas odczytywania postu: ${e.message}")
        }
    }

    // Nowa funkcja do wyświetlania listy plików JSON
    private fun listJsonFilesDetailed() {
        val files = FileUtils.listJsonFiles()
        
        if (files.isEmpty()) {
            println("Brak zapisanych plików JSON")
            return
        }
        
        println("Zapisane pliki JSON (${files.size}):")
        files.sortedBy { it.nameWithoutExtension.toIntOrNull() ?: Int.MAX_VALUE }.forEach { file ->
            val postId = file.nameWithoutExtension.toIntOrNull() ?: 0
            val lastModified = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .format(LocalDateTime.ofInstant(java.nio.file.Files.getLastModifiedTime(file.toPath()).toInstant(), java.time.ZoneId.systemDefault()))
            
            // Sprawdź, czy plik zawiera post z relacjami
            val (hasRelations, title) = FileUtils.checkPostFileType(file)
            val relationsInfo = if (hasRelations) "[z relacjami]" else ""
            
            println("- [${postId}] ${title} ${relationsInfo} (Ostatnia modyfikacja: $lastModified)")
        }
    }

    private fun fetchPosts(args: List<String>) = runBlocking {
        try {
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            println("Pobieranie postów z JSONPlaceholder API...")
            val posts = apiService.getPosts()
            println("Pobrano ${posts.size} postów")
            
            posts.take(10).forEach { post ->
                println("- [${post.id}] ${post.title}")
            }
            
            if (posts.size > 10) {
                println("... i ${posts.size - 10} więcej")
            }
        } catch (e: Exception) {
            println("Błąd podczas pobierania postów: ${e.message}")
        }
    }

    private fun savePosts(args: List<String>) = runBlocking {
        try {
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            
            if (args.isEmpty()) {
                println("Zapisywanie wszystkich postów...")
                val posts = apiService.getPosts()
                var successCount = 0
                
                posts.forEach { post ->
                    if (FileUtils.savePostAsJson(post)) {
                        successCount++
                    }
                }
                
                println("Zapisano $successCount z ${posts.size} postów")
            } else {
                val id = args[0].toIntOrNull()
                if (id != null) {
                    println("Zapisywanie postu o ID: $id...")
                    val post = apiService.getPost(id)
                    if (FileUtils.savePostAsJson(post)) {
                        println("Post został zapisany pomyślnie")
                    } else {
                        println("Nie udało się zapisać postu")
                    }
                } else {
                    println("Nieprawidłowe ID postu")
                }
            }
        } catch (e: Exception) {
            println("Błąd podczas zapisywania postów: ${e.message}")
        }
    }

    // Nowa funkcja zapisująca posty z relacjami
    private fun savePostsWithRelations() = runBlocking {
        try {
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            
            println("Zapisywanie wszystkich postów z relacjami...")
            
            val posts = apiService.getPosts()
            var successCount = 0
            
            for (post in posts) {
                try {
                    val user = apiService.getUser(post.userId)
                    val comments = apiService.getCommentsForPost(post.id)
                    
                    val postWithRelations = PostWithRelations(
                        id = post.id,
                        userId = post.userId,
                        title = post.title,
                        body = post.body,
                        user = user,
                        comments = comments,
                        fetchDate = post.fetchDate
                    )
                    
                    if (FileUtils.savePostWithRelationsAsJson(postWithRelations)) {
                        successCount++
                        println("Zapisano post ${post.id} z relacjami")
                    }
                } catch (e: Exception) {
                    println("Błąd podczas zapisywania postu ${post.id} z relacjami: ${e.message}")
                }
            }
            
            println("Zapisano $successCount z ${posts.size} postów z relacjami")
            
        } catch (e: Exception) {
            println("Błąd podczas zapisywania postów z relacjami: ${e.message}")
        }
    }

    private fun listPosts() {
        val posts = FileUtils.listSavedPosts()
        if (posts.isEmpty()) {
            println("Brak zapisanych postów")
        } else {
            println("Zapisane posty:")
            posts.forEach { post: Post ->
                println("- [${post.id}] ${post.title}")
            }
        }
    }

    private fun getPost(args: List<String>) = runBlocking {
        // Sprawdzamy czy przekazano ID
        if (args.isEmpty()) {
            println("Podaj ID postu")
            return@runBlocking
        }

        val id = args[0].toIntOrNull()
        if (id == null) {
            println("Nieprawidłowe ID postu")
            return@runBlocking
        }

        try {
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            val post = apiService.getPost(id)
            println("""
                Post #${post.id}
                Tytuł: ${post.title}
                Autor: ${post.userId}
                Treść: ${post.body}
            """.trimIndent())
        } catch (e: Exception) {
            println("Błąd podczas pobierania postu: ${e.message}")
        }
    }

    private fun clearPosts() {
        if (FileUtils.clearOutputDirectory()) {
            println("Katalog wyjściowy został wyczyszczony")
        } else {
            println("Nie udało się wyczyścić katalogu wyjściowego")
        }
    }

    // Funkcja usuwania pojedynczego postu
    private fun deletePost(args: List<String>) = runBlocking {
        if (args.isEmpty()) {
            println("Podaj ID postu do usunięcia")
            return@runBlocking
        }

        val id = args[0].toIntOrNull()
        if (id == null) {
            println("Nieprawidłowe ID postu")
            return@runBlocking
        }

        val filePath = FileUtils.getPostFilePath(id)
        if (FileUtils.deleteFile(filePath)) {
            println("Post o ID $id został usunięty")
        } else {
            println("Nie znaleziono postu o ID $id lub nie udało się go usunąć")
        }
    }

    // Funkcja szybkiego odświeżania (tylko nowe posty)
    private fun quickRefresh() = runBlocking {
        try {
            println("Wykonywanie szybkiego odświeżania danych...")
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            val posts = apiService.getPosts()
            
            // Szybkie odświeżanie - tylko nowe posty
            val savedPosts = FileUtils.listSavedPosts()
            val savedIds = savedPosts.map { it.id }.toSet()
            val newPosts = posts.filter { it.id !in savedIds }
            
            if (newPosts.isEmpty()) {
                println("Brak nowych postów do zapisania")
                return@runBlocking
            }
            
            var successCount = 0
            
            if (withRelations) {
                for (post in newPosts) {
                    try {
                        val user = apiService.getUser(post.userId)
                        val comments = apiService.getCommentsForPost(post.id)
                        
                        val postWithRelations = PostWithRelations(
                            id = post.id,
                            userId = post.userId,
                            title = post.title,
                            body = post.body,
                            user = user,
                            comments = comments,
                            fetchDate = post.fetchDate
                        )
                        
                        if (FileUtils.savePostWithRelationsAsJson(postWithRelations)) {
                            successCount++
                        }
                    } catch (e: Exception) {
                        println("Błąd podczas zapisywania postu ${post.id} z relacjami: ${e.message}")
                    }
                }
            } else {
                newPosts.forEach { post ->
                    if (FileUtils.savePostAsJson(post)) {
                        successCount++
                    }
                }
            }
            
            println("Zapisano $successCount nowych postów")
        } catch (e: Exception) {
            println("Błąd podczas odświeżania danych: ${e.message}")
        }
    }

    // Funkcja pełnego odświeżania
    private fun hardRefresh() = runBlocking {
        try {
            println("Wykonywanie pełnego odświeżania danych...")
            
            // Najpierw wyczyść katalog
            if (!FileUtils.clearOutputDirectory()) {
                println("Ostrzeżenie: Nie udało się wyczyścić katalogu wyjściowego")
            }
            
            // Pobierz i zapisz wszystkie posty
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            val posts = apiService.getPosts()
            
            var successCount = 0
            
            if (withRelations) {
                for (post in posts) {
                    try {
                        val user = apiService.getUser(post.userId)
                        val comments = apiService.getCommentsForPost(post.id)
                        
                        val postWithRelations = PostWithRelations(
                            id = post.id,
                            userId = post.userId,
                            title = post.title,
                            body = post.body,
                            user = user,
                            comments = comments,
                            fetchDate = post.fetchDate
                        )
                        
                        if (FileUtils.savePostWithRelationsAsJson(postWithRelations)) {
                            successCount++
                        }
                    } catch (e: Exception) {
                        println("Błąd podczas zapisywania postu ${post.id} z relacjami: ${e.message}")
                    }
                }
            } else {
                posts.forEach { post ->
                    if (FileUtils.savePostAsJson(post)) {
                        successCount++
                    }
                }
            }
            
            println("Zapisano $successCount z ${posts.size} postów")
        } catch (e: Exception) {
            println("Błąd podczas pełnego odświeżania danych: ${e.message}")
        }
    }

    // Rozszerzona funkcja filtrowania
    private fun filterPosts(args: List<String>) = runBlocking {
        if (args.isEmpty()) {
            println("Podaj parametry filtrowania")
            println("Dostępne filtry: --min-id <id>, --max-id <id>, --title <tekst>, --body <tekst>, --date-after <data>")
            return@runBlocking
        }

        try {
            val apiService = ServiceBuilder.buildService(ApiService::class.java)
            val posts = apiService.getPosts()
            
            var filteredPosts = posts
            var i = 0
            
            while (i < args.size) {
                when (args[i]) {
                    "--min-id" -> {
                        if (i + 1 < args.size) {
                            val minId = args[i + 1].toIntOrNull()
                            if (minId != null) {
                                filteredPosts = filteredPosts.filter { it.id >= minId }
                                i += 2
                            } else {
                                println("Nieprawidłowa wartość dla --min-id")
                                i += 2
                            }
                        } else {
                            println("Brakujący argument dla --min-id")
                            i += 1
                        }
                    }
                    "--max-id" -> {
                        if (i + 1 < args.size) {
                            val maxId = args[i + 1].toIntOrNull()
                            if (maxId != null) {
                                filteredPosts = filteredPosts.filter { it.id <= maxId }
                                i += 2
                            } else {
                                println("Nieprawidłowa wartość dla --max-id")
                                i += 2
                            }
                        } else {
                            println("Brakujący argument dla --max-id")
                            i += 1
                        }
                    }
                    "--title" -> {
                        if (i + 1 < args.size) {
                            val titleText = args[i + 1]
                            filteredPosts = filteredPosts.filter { 
                                it.title.contains(titleText, ignoreCase = true) 
                            }
                            i += 2
                        } else {
                            println("Brakujący argument dla --title")
                            i += 1
                        }
                    }
                    // Nowy filtr - zawartość treści
                    "--body" -> {
                        if (i + 1 < args.size) {
                            val bodyText = args[i + 1]
                            filteredPosts = filteredPosts.filter { 
                                it.body.contains(bodyText, ignoreCase = true) 
                            }
                            i += 2
                        } else {
                            println("Brakujący argument dla --body")
                            i += 1
                        }
                    }
                    // Nowy filtr - data pobrania
                    "--date-after" -> {
                        if (i + 1 < args.size) {
                            try {
                                val dateText = args[i + 1]
                                val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
                                val date = LocalDateTime.parse(dateText, dateFormat)
                                
                                filteredPosts = filteredPosts.filter { post ->
                                    post.fetchDate?.let { fetchDate ->
                                        try {
                                            val postDate = LocalDateTime.parse(fetchDate, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                                            postDate.isAfter(date)
                                        } catch (e: Exception) {
                                            false
                                        }
                                    } ?: false
                                }
                                i += 2
                            } catch (e: Exception) {
                                println("Nieprawidłowy format daty. Użyj formatu: yyyy-MM-ddTHH:mm:ss")
                                i += 2
                            }
                        } else {
                            println("Brakujący argument dla --date-after")
                            i += 1
                        }
                    }
                    else -> {
                        println("Nieznany parametr filtrowania: ${args[i]}")
                        i += 1
                    }
                }
            }
            
            println("Znaleziono ${filteredPosts.size} pasujących postów:")
            filteredPosts.forEach { post ->
                println("- [${post.id}] ${post.title}")
            }
            
        } catch (e: Exception) {
            println("Błąd podczas filtrowania postów: ${e.message}")
        }
    }

    // Nowa funkcja - eksport do ZIP
    private fun exportAsZip(args: List<String>) = runBlocking {
        try {
            println("Eksportowanie postów do pliku ZIP...")
            
            val postIds = if (args.isNotEmpty()) {
                args.mapNotNull { it.toIntOrNull() }
            } else {
                null // Wszystkie posty
            }
            
            val zipPath = FileUtils.createPostsZipFile(postIds)
            if (zipPath != null) {
                println("Pomyślnie utworzono plik ZIP: $zipPath")
            } else {
                println("Nie udało się utworzyć pliku ZIP. Brak postów do zapisania lub wystąpił błąd.")
            }
        } catch (e: Exception) {
            println("Błąd podczas eksportowania do ZIP: ${e.message}")
        }
    }

    // Funkcja przełączania trybu z relacjami / bez relacji
    private fun toggleRelations(args: List<String>) {
        if (args.isEmpty()) {
            withRelations = !withRelations
        } else {
            val value = args[0].lowercase()
            withRelations = when (value) {
                "on", "true", "yes", "1" -> true
                "off", "false", "no", "0" -> false
                else -> {
                    println("Nieprawidłowa wartość. Użyj: on/off, true/false, yes/no, 1/0")
                    return
                }
            }
        }
        
        println("Tryb pobierania z relacjami: ${if (withRelations) "WŁĄCZONY" else "WYŁĄCZONY"}")
    }

    private fun setEnvironment(args: List<String>) {
        if (args.isEmpty()) {
            println("Aktualne środowisko: ${currentEnv.name}")
            return
        }

        val newEnv = when (args[0].lowercase()) {
            "dev", "development" -> Environment.DEVELOPMENT
            "stage", "staging" -> Environment.STAGING
            "prod", "production" -> Environment.PRODUCTION
            else -> {
                println("Nieprawidłowe środowisko. Dostępne opcje: dev, stage, prod")
                return
            }
        }

        currentEnv = newEnv
        currentConfig = ConfigProvider.getConfig(currentEnv)
        println("Zmieniono środowisko na: ${currentEnv.name}")
    }

    private fun printHelp() {
        println("""
            Post Manager CLI - Narzędzie do zarządzania postami
            
            Dostępne komendy:
            posts                        : Pobiera wszystkie posty z API
            posts <id>                   : Pobiera i wyświetla post o podanym ID
            save <id>                    : Zapisuje post o podanym ID
            save-all                     : Zapisuje wszystkie posty
            save-all-with-relations      : Zapisuje wszystkie posty z relacjami (użytkownik, komentarze)
            saved-posts                  : Wyświetla listę zapisanych postów
            delete <id>                  : Usuwa zapisany post o podanym ID
            clear                        : Czyści katalog wyjściowy
            quick-refresh                : Szybkie odświeżenie danych (tylko nowe posty)
            hard-refresh                 : Pełne odświeżenie wszystkich danych
            filter --min-id <id>         : Filtruje posty z ID >= podanej wartości
            filter --max-id <id>         : Filtruje posty z ID <= podanej wartości
            filter --title <tekst>       : Filtruje posty zawierające tekst w tytule
            filter --body <tekst>        : Filtruje posty zawierające tekst w treści
            filter --date-after <data>   : Filtruje posty pobrane po określonej dacie (format: yyyy-MM-ddTHH:mm:ss)
            export-zip [id1 id2 ...]     : Eksportuje wszystkie lub wybrane posty do pliku ZIP
            toggle-relations [on|off]    : Włącza/wyłącza tryb pobierania z relacjami
            env [dev|stage|prod]         : Ustawia lub wyświetla aktualne środowisko
            help                         : Wyświetla tę pomoc
            
            Przykłady:
            post-manager posts               : Pobiera wszystkie posty
            post-manager posts 1             : Wyświetla post o ID 1
            post-manager save 1              : Zapisuje post o ID 1
            post-manager filter --title lorem : Filtruje posty zawierające "lorem" w tytule
            post-manager export-zip 1 2 3    : Eksportuje posty o ID 1, 2 i 3 do pliku ZIP
        """.trimIndent())
    }
}