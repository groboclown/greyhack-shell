// Unit tests for star-glob

//#require files/star-glob.gs
//#require errors.gs
//#require tests.gs

TestMatchStarPattern = function(t)
    t.AssertTrue FileLib.Glob.MatchStarPattern("tuna", "*")
    t.AssertTrue FileLib.Glob.MatchStarPattern("tuna", "tuna")
    t.AssertFalse FileLib.Glob.MatchStarPattern("tuna", "sushi")
end function

if locals == globals then T.RunTests
