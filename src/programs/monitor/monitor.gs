// Non-interactive monitor.
// Invokes "widgets" to perform the function.


if params.len < 2 or params[0] == "-h" or params[0] == "--help" then
    print "Non-interactive terminal monitor"
    print "Usage: monitor (widget executable path) (widget executable args...)"
    print "Example: monitor ps /home/user/bin/widgets/process"
    exit
end if

// Uses the same "pages" concept as the mc, but condensed to just one object.
base = get_custom_object
base.pages = {}
base.context = {
    "shell": get_shell,
    "host": get_shell.host_computer,
}

config = {
    "height": 30,
    "width": 80,
    "columns": {
        "ps": [
            ["USER", 6, "#005000"],
            ["PID", 6, "#ffffff"],
            ["CPU", 6, "#ff00ff"],
            ["MEM", 6, "#ff00ff"],
            ["COMMAND", -1, "#ff0000"],
        ],
    },
    "spacer": " ",
    "rate": 4,
    "widgetdir": home_dir + "/bin/widget",
}

// Page
page = params[0]
base.pages[page] = []

// Context
shell = get_shell

// Command to invoke.
widget_cmd = params[1]
f = base.context.host.File(widget_cmd)
if f == null or f.is_folder or not f.is_binary then
    f = base.context.host.File(config.widgetdir + "/" + widget_cmd)
end if
if f == null or f.is_folder or not f.is_binary then
    exit("Could not find widget " + widget_cmd)
end if
widget_cmd = f.path
widget_args = params[2:].join(" ")


// Show the UI
while true
    shell.launch(widget_cmd, widget_args)

    clear_screen
    out = ">> " + page + " <<"
    while out.len < config.width
        out = out + "="
    end while
    print out

    i = 0
    while i < base.pages[page].len and i < config.height
        pos = 0
        out = ""
        row = base.pages[page][i]
        for cdef in config.columns[page]
            out = out + "<color " + cdef[2] + ">"
            value = ""
            if row.hasIndex(cdef[0]) then
                value = str(row[cdef[0]])
            end if
            j = 0
            while j < value.len and (j < cdef[1] or cdef[1] < 0) and pos < config.width
                out = out + value[j]
                j = j + 1
                pos = pos + 1
            end while
            while (j < cdef[1] or cdef[1] < 0) and pos < config.width
                out = out + " "
                j = j + 1
                pos = pos + 1
            end while
            out = out + "</color>"
        end for
        print out
        i = i + 1
    end while

    wait config.rate
end while
