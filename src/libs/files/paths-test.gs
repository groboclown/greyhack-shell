import_code("paths.gs")
import_code("../errors.gs")
import_code("../tests.gs")

// TestPaths_SplitPath_empty Test SplitPath with an empty string.
TestPaths_SplitPath_empty = function(t)
    ret = FileLib.Paths.SplitPath("")
    t.AssertEqual([], ret)
end function

// TestPaths_SplitPath_home_hidden_file Test SplitPath with a hidden file in the home directory.
TestPaths_SplitPath_home_hidden_file = function(t)
    ret = FileLib.Paths.SplitPath("~/.my.file")
    t.AssertEqual(["~", ".my.file"], ret)
end function

// TestPaths_NormalizePath_empty Test NormalizePath with an empty path list.
TestPaths_NormalizePath_empty = function(t)
    ret = FileLib.Paths.NormalizePath([])
    t.AssertEqual([], ret)
end function

// TestPaths_NormalizePath_rel_cwd Test NormalizePath with a relative path list.
TestPaths_NormalizePath_rel_cwd = function(t)
    ret = FileLib.Paths.NormalizePath(["a", "b"], null, "/tmp")
    t.AssertEqual(["tmp", "a", "b"], ret)
end function

// TestPaths_NormalizePath_rel_home Test NormalizePath with a relative to home path list.
TestPaths_NormalizePath_rel_home = function(t)
    ret = FileLib.Paths.NormalizePath(["~", "a", "b"], "/home/x", null)
    t.AssertEqual(["home", "x", "a", "b"], ret)
end function

// TestPaths_JoinPath_empty Test JoinPath with no values.
TestPaths_JoinPath_empty = function(t)
    ret = FileLib.Paths.JoinPath([])
    t.AssertEqual("/", ret)
end function

// TestPaths_JoinPath_several Test JoinPath with several values.
TestPaths_JoinPath_several = function(t)
    ret = FileLib.Paths.JoinPath(["a", "b", "c"])
    t.AssertEqual("/a/b/c", ret)
end function

if locals == globals then T.RunTests
