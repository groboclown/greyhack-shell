// Unit Test Tooling
//
// Two modes of running.
//
// This supports the Mocha style:
//
//     T.Describe("when a number is 2", function()
//        T.Test("it is 2", function(t)
//          t.Expect(2).ToBe(2)
//        end function)
//     end function)
//
// All assertion and check functions return "true" on failures,
// so that the code for early exit on required checks are
// easier to write:
//
//     if t.AssertTrue(false) then return

//#include errors.gs

T = {}
T.depth = 0
T.errors = []

// T.T The Test Case holder.
T.T = {}
T.T.New = function(errorLogger, name)
    ret = new T.T
    ret.name = name
    ret.errors = []
    ret.logger = errorLogger
    ret.depth = T.depth
    return ret
end function

// T.T.SubTest Run a function as a sub-test.  Returns true if it fails.
T.T.SubTest = function(name, testFunc)
    subErrs = T.RunTest(testFunc, name, sub.depth)
    self.errors = self.errors + subErrs
    return subErrs.len > 0
end function


// T.T.Fail Reports a failure
T.T.Fail = function(text=null)
    if text == null then
        text = "failure"
    end if
    err = { "test": ret.name, "failure": text }
    self.errors.push(err)
    self.logger(text)
    return true
end function

// T.T.AssertTrue Reports a failure if the first argument is not true
T.T.AssertTrue = function(value, text=null)
    if value != true then
        self.Fail(text)
        return true
    end if
    return false
end function

// T.T.AssertFalse
T.T.AssertFalse = function(value, text=null)
    if value != false then
        self.Fail(text)
        return true
    end if
    return false
end function

// T.T.AssertEqual
T.T.AssertEqual = function(actual, expected, text=null)
    if actual != expected then
        self.Fail("expected " + expected + ", found " + actual)
        return true
    end if
    return false
end function

// T.T.AssertNotEqual
T.T.AssertNotEqual = function(actual, expected, text=null)
    if actual == expected then
        self.Fail("found " + expected)
        return true
    end if
    return false
end function

// T.T.AssertNull
T.T.AssertNull = function(actual, text=null)
    if actual != null then
        self.Fail("expected null, but found " + actual)
        return true
    end if
    return false
end function

// T.T.AssertNotNull
T.T.AssertNotNull = function(actual, text=null)
    if actual == null then
        self.Fail("expected not null value")
        return true
    end if
    return false
end function

T.T.Expect = function(value)
    ret = new T.ex
    ret.value = value
    ret.asTrue = true
    ret.t = self
    return ret
end function

T.ex = {}

T.ex.ToBe = function(value, text=null)
    if self.asTrue then
        return self.t.AssertEqual(self.value, value, text)
    else
        return self.t.AssertNotEqual(self.value, value, text)
    end if
end function

T.ex.Not = function()
    self.asTrue = not self.asTrue
end function


// T.Describe A test context.
T.Describe = function(text, f)
    initial_depth = T.depth
    T.depth = T.depth + 1

    T.Logger.DescribeEnd(initial_depth, text)
    f()
    T.Logger.DescribeEnd(initial_depth, text)

    T.depth = initial_depth
end function

// T.Test A test execution context.
T.Test = function(text, f)
    initial_depth = T.depth

    T.depth = T.depth + 1

    T.Logger.TestStart(initial_depth, text)
    t = T.T.New(function(err) T.Logger.Error(initial_depth, err) end function, text)
    f(t)
    T.Logger.TestEnd(initial_depth, text, t.errors.len <= 0)

    T.errors = T.errors + t.errors
    T.depth = initial_depth
end function

// T.ConsoleLogger a logger that reports test execution state to the console.
T.ConsoleLogger = {}
T.ConsoleLogger.New = function()
    ret = new T.ConsoleLogger
    return ret
end function

T.ConsoleLogger.DescribeStart = function(depth, name)
    print "<color=#404040>" + self.GetIndent(depth) + name + " ...</color>"
end function

T.ConsoleLogger.DescribeEnd = function(depth, name)
end function

T.ConsoleLogger.TestStart = function(depth, name)
    print "<color=#006060>" + self.GetIndent(depth) + name + " ...</color>"
end function

T.ConsoleLogger.Error = function(depth, err)
    text = err
    if err isa map and err["Text"] isa string then
        text = err["Text"]
    end if
    print self.GetIndent(depth + 1) + "<color=#800000>Fail</color> - " + text
end function

T.ConsoleLogger.TestEnd = function(depth, name, pass)
    indent = self.GetIndent(depth)
    if pass then
        print "<color=#006060>" + indent + text + " ... <color=#008000>OK!</color>"
    else
        print "<color=#006060>" + indent + text + " ... <color=#800000>Failed</color>"
    end if
end function

T.ConsoleLogger.GetIndent = function(depth)
    indent = ""
    for _ in range(0, depth)
        indent = indent + "  "
    end for
    return indent
end function

// T.Logger A Logger instance.
T.Logger = T.ConsoleLogger.New()

// RunTests Run all the tests in the global namespace.
T.RunTests = function(space=null)
    if space == null then
        space = globals
    end if
    total = 0
    errors = 0
    for name in space.indexes
        if name[:4] == "Test" and space[name] isa funcRef then
            total = total + 1
            res = T.RunTest(space[name], name)
            errors = errors + res
        end if
    end for
    if total == 0 then
        T.Logger.Error(0, "No tests")
        errors = errors + 1
    end if
    return errors
end function

// RunTest Run a test function, passed as an argument
T.RunTest = function(testFunc, name=null, depth=0)
    if name == null then
        if testFunc isa string then
            name = testFunc
            testFunc = globals[name]
        else
            name = "test"
        end if
    end if
    t = T.T.New(function(err) T.Logger.Error(depth, err) end function, name)
    if testFunc isa funcRef then
        T.Logger.TestStart(depth, name)
        testFunc(t)
        T.Logger.TestEnd(depth, name, t.errors.len <= 0)
    else
        t.Fail("Test is not a function")
    end if
    return t.errors
end function
