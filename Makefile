.PHONY: default clean

default: index.html

clean :
	rm -rf page-index.odoc page-index.odocl html

page-index.odoc : index.mld
	odoc compile index.mld

page-index.odocl : page-index.odoc
	odoc link page-index.odoc

index.html : page-index.odocl assets/odoc.css
	odoc html-generate -o . page-index.odocl --theme-uri=assets

assets/odoc.css :
	odoc support-files -o assets

