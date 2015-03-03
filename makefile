PATH := node_modules/.bin:$(PATH)
SHELL = /bin/sh

.PHONY: all clean

all: build

clean:
	@rm -rf build

build: build/index.html build/snippeter.js

build/index.html: app/index.html
	@mkdir -p $(@D)
	@cp $^ $@
	@echo $@

build/snippeter.js: app/snippeter.js
	@mkdir -p $(@D)
	@uglifyjs $^ --output -m -c --output $@
	@echo $@

