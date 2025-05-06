package net.maciejkasik

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit service interface for JSONPlaceholder API
 */
interface ApiService {
    @GET("posts")
    suspend fun getPosts(): List<Post>
    
    @GET("posts/{id}")
    suspend fun getPost(@Path("id") id: Int): Post
    
    @GET("posts/{id}/comments")
    suspend fun getCommentsForPost(@Path("id") id: Int): List<Comment>
    
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: Int): User
    
    // New endpoint to fetch posts with related data
    @GET("posts")
    suspend fun getPostsWithRelations(@Query("_embed") embed: String = "comments", @Query("_expand") expand: String = "user"): List<PostWithRelations>
    
    // New endpoint to fetch a specific post with related data
    @GET("posts/{id}")
    suspend fun getPostWithRelations(@Path("id") id: Int, @Query("_embed") embed: String = "comments", @Query("_expand") expand: String = "user"): PostWithRelations
} 