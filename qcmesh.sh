mg=/Users/roberto/Applications/brainbits/m.meshgeometry/meshgeometry_mac
ml=/Applications/_Graph/meshlab-133.app/Contents/MacOS/meshlabserver
subdir="/Users/roberto/Documents/_04_Data/2007_10Primates/2008_07Baboons-Kochunov/04-sphericaldemons/qcmesh/fs"

find $subdir -name *.white| while read f; do
	$mg -i $f -centre -o $f.ply
	$ml -i $f.ply -o $f.ctm
	rm $f.ply
done