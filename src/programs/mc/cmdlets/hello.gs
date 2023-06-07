// The Hello World Cmdlet

HelloWorldCmdlet = new ABCCmdlet

HelloWorldCmdlet.New = function()
    ret = new HelloWorldCmdlet
    ret.Name = "hello"
    ret.Help = "A simple hello world cmdlet."
    ret.Args = []
    return ret
end function

HelloWorldCmdlet.Run = function(term)
    term.Stdout.Println("Hello, world!")
end function

CmdletStore.Add(HelloWorldCmdlet.New())
