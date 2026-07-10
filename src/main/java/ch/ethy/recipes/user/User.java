package ch.ethy.recipes.user;

import static ch.ethy.recipes.user.Role.USER;

import ch.ethy.recipes.db.BaseEntity;
import jakarta.annotation.Nonnull;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
public class User extends BaseEntity {
  @Nonnull
  @Column(unique = true)
  private String username;

  @Nonnull
  @Column(unique = true)
  private String email;

  @Nonnull private String password;

  @Enumerated(EnumType.STRING)
  @Nonnull
  private Set<Role> roles = new HashSet<>(List.of(USER));

  @Enumerated(EnumType.STRING)
  @Column(name = "preferred_language", nullable = false)
  @Nonnull
  private Language preferredLanguage = Language.DEFAULT;

  // Bumped only via UserRepository#incrementTokenVersion (an atomic DB increment), never through a
  // setter, so concurrent revocations cannot lose updates.
  @Column(name = "token_version", nullable = false)
  private int tokenVersion = 0;

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public Set<Role> getRoles() {
    return roles;
  }

  public int getTokenVersion() {
    return tokenVersion;
  }

  public Language getPreferredLanguage() {
    return preferredLanguage;
  }

  public void setPreferredLanguage(Language preferredLanguage) {
    this.preferredLanguage = preferredLanguage;
  }

  public void addRole(Role role) {
    this.roles.add(role);
  }

  public void removeRole(Role role) {
    this.roles.remove(role);
  }
}
