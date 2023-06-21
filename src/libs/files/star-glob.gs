// Glob pattern support.
//#requires files/paths.gs

if not globals.hasIndex("FileLib") then globals.FileLib = {}


if not FileLib.hasIndex("Glob") then
    globals.FileLib.Glob = {}
end if

// MatchStar() Matches a path with '*' patterns.
// Returns list of files that match.
// The pattern must be an absolute path.
FileLib.Glob.MatchStar = function(pattern, computer)
    // print("[GLOB] matching [" + pattern + "]")
    match_paths = FileLib.Paths.SplitPath(pattern)
    if match_paths.len <= 0 then return []
    if match_paths[0] == "/" then match_paths = match_paths[1:]
    matches = ["/"]
    for part in match_paths
        // For each match, extend it with the next path part that matches.
        next_matches = []
        for parent in matches
            next_matches = next_matches + FileLib.Glob.MatchStarSinglePath(parent, part, computer)
        end for
        matches = next_matches
    end for
    return matches
end function

// MatchStarSinglePath() Matches a single path pattern in a folder.
//
// Returns list of file paths (strings) matching.
FileLib.Glob.MatchStarSinglePath = function(parent, pattern, computer)
    // print("[GLOB] checking " + parent + " for [" + pattern + "]")
    ret = []
    base = computer.File(parent)
    if base == null then
        // Does not exist.  Exit early.
        // print("[GLOB] - no such parent file")
        return ret
    end if
    if not base.is_folder then
        // Not a folder, so can't contain other files.
        // print("[GLOB] - that's not a folder, so skipping.")
        return ret
    end if
    kids = base.get_folders
    for kid in kids
        // print("[GLOB] - checking child folder " + kid.name + " ; " + kid.path)
        if FileLib.Glob.MatchStarPattern(kid.name, pattern) then
            // print("[GLOB] - - matched")
            ret.push(kid.path)
        end if
    end for
    kids = base.get_files
    for kid in kids
        // print("[GLOB] - checking child file " + kid.name + " ; " + kid.path)
        if FileLib.Glob.MatchStarPattern(kid.name, pattern) then
            // print("[GLOB] - - matched")
            ret.push(kid.path)
        end if
    end for
    return ret
end function

// MatchStarPattern() Matches the * glob pattern against the test text.
//
// Returns true on match, false on not match.
FileLib.Glob.MatchStarPattern = function(test, pattern)
    // A single "*" pattern matches everything.
    if pattern == "*" then return true

    pos = pattern.indexOf("*")
    if pos < 0 then
        // Exact match only
        return test == pattern
    end if

    // For now, just a single '*' is all that can be matched.
    pre = pattern[:pos]
    post = pattern[pos+1:]
    return test[:pos] == pre and test[test.len-post.len:] == post
end function
