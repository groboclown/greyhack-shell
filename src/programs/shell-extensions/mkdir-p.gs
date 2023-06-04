// Create directories and everything in-between.
// Equivalent of `mkdir -p`
// Version 1.0.0

if params.len < 1 or params[0] == "-h" or params[0] == "--help" then
    exit("Usage: mkdir-p (dir name)")
end if

//#include file-paths.gs
paths = Paths.New()

for pidx in params.indexes
    param = params[pidx]
    paths.MakeDirs(param)
end for
