package ch.ethy.recipes.admin;

import ch.ethy.recipes.user.UserDto;
import ch.ethy.recipes.user.UserService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
  private final UserService userService;

  public AdminUserController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping
  public PagedModel<UserDto> getUsers(@PageableDefault(size = 10) Pageable pageable) {
    return new PagedModel<>(userService.getUsers(pageable));
  }
}
