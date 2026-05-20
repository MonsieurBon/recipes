package ch.ethy.recipes.user;

import jakarta.annotation.security.RolesAllowed;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping()
  @RolesAllowed("ADMIN")
  public List<UserDto> getAllUsers() {
    return userService.getAllUsers();
  }

  @GetMapping("{id}")
  @RolesAllowed("ADMIN")
  public UserDto getUser(@PathVariable long id) {
    return userService
        .findUser(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }
}
