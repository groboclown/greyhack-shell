// A Shell Replacement

//#require format/formatted-str.gs
//#require files/paths.gs
//#require files/star-glob.gs
//#require fd.gs
//#require ui.gs
//#require session.gs
//#require cmdlet.gs
//#require parser.gs
//#require cmdlets/*

// Architecture:
//   The mc shell has "command-lets" that allow for interactivity, essentially
//   command line tools.  They are invoked via "launch" and share the "pages"
//   and arguments through the parent process' shared object.
//
//   The "Pages" is a bit like a global clip-board, and easily referenced
//   from the command-line or viewed through a widget.  It contains named "pages", which
//   are lists of maps.
//
//   The shell also has sessions, that have a current login / host.  The command-lets operate
//   on this session.  Sessions have hooks, that allow for configured behavior.
//   Run on open, run before command, run after command, run on close.  This allows for
//   remote shell operations.
//
//   

session = UserSession.New()
terminal = Terminal.New(session)

while true
    cmd = terminal.Prompt()
    if cmd == "exit" then exit
    session.AddCmdToHistory(cmd)
end while
