// list of processes

page = "ps"

standAlone = false
base = get_custom_object
if not base.hasIndex("pages") or not base.hasIndex("context") then
    // Not running in the monitor.
    standAlone = true
    base.pages = {}
    base.pages[page] = []
    base.context = {"shell": get_shell, "host": get_shell.host_computer}
end if

data = base.context.host.show_procs
if not data isa string then exit("bad show_procs")

rows = data.split(char(10))
header = rows[0].split(" ")
rows = rows[1:]

base.pages[page] = []
for row in rows
    cols = row.split(" ")
    parsed = {}
    for idx in cols.indexes
        parsed[header[idx]] = cols[idx]
    end for
    base.pages[page].push(parsed)
end for

if standAlone then
    for row in base.pages[page]
        val = ""
        for k in row.indexes
            val = val + " <color #00ffff>" + k + "</color>=<color #a0a0a0>" + row[k] + "</color> |"
        end for
        print val
    end for
end if
