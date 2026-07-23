package ch.ethy.recipes.user;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
  @Query("SELECT u FROM User u WHERE u.username = :usernameOrEmail OR u.email = :usernameOrEmail")
  Optional<User> findByUsernameOrEmail(String usernameOrEmail);

  boolean existsByUsername(String username);

  boolean existsByEmail(String email);

  @Query("SELECT u.tokenVersion FROM User u WHERE u.id = :id")
  Optional<Integer> findTokenVersionById(long id);

  /**
   * Loads every currently active admin, locking those rows for the rest of the transaction.
   *
   * <p>The deactivation guard uses this so concurrent deactivations serialize: {@code FOR UPDATE}
   * is a current read (not a snapshot), so two admins deactivating each other cannot both observe
   * the other as still active and lock everyone out — the second transaction blocks, then re-reads
   * the reduced set once the first commits. Roles live in a JSON column, so admin membership is
   * matched with {@code JSON_CONTAINS} in native SQL.
   */
  @Query(
      value =
          "SELECT * FROM users WHERE enabled = TRUE AND JSON_CONTAINS(roles, '\"ADMIN\"') FOR UPDATE",
      nativeQuery = true)
  List<User> findActiveAdminsForUpdate();

  @Modifying
  @Transactional
  @Query("UPDATE User u SET u.tokenVersion = u.tokenVersion + 1 WHERE u.id = :id")
  int incrementTokenVersion(long id);
}
