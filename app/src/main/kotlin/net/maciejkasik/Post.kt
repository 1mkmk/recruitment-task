package net.maciejkasik

import kotlinx.serialization.Serializable
import java.time.LocalDateTime

/**
 * Data class representing a post from JSONPlaceholder
 */
@Serializable
data class Post(
    val userId: Int,
    val id: Int,
    val title: String,
    val body: String,
    val fetchDate: String? = null
)

/**
 * Data class representing a user from JSONPlaceholder
 */
@Serializable
data class User(
    val id: Int,
    val name: String,
    val username: String,
    val email: String,
    val phone: String? = null,
    val website: String? = null,
    val company: Company? = null,
    val address: Address? = null
)

/**
 * Data class representing a company from JSONPlaceholder
 */
@Serializable
data class Company(
    val name: String,
    val catchPhrase: String? = null,
    val bs: String? = null
)

/**
 * Data class representing an address from JSONPlaceholder
 */
@Serializable
data class Address(
    val street: String? = null,
    val suite: String? = null,
    val city: String? = null,
    val zipcode: String? = null,
    val geo: Geo? = null
)

/**
 * Data class representing a geo location from JSONPlaceholder
 */
@Serializable
data class Geo(
    val lat: String? = null,
    val lng: String? = null
)

/**
 * Data class representing a comment from JSONPlaceholder
 */
@Serializable
data class Comment(
    val postId: Int,
    val id: Int,
    val name: String,
    val email: String,
    val body: String
)

/**
 * Data class representing a post with relations from JSONPlaceholder
 */
@Serializable
data class PostWithRelations(
    val userId: Int,
    val id: Int,
    val title: String,
    val body: String,
    val user: User? = null,
    val comments: List<Comment>? = null,
    val fetchDate: String? = null
) 