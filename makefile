PATH := node_modules/.bin:$(PATH)
SHELL = /bin/sh

buildfiles := build/index.html build/snippeter-ui.js build/snippeter-ui.css
.PHONY: all clean

all: build

clean:
	@rm -rf $(buildfiles)

build: $(buildfiles)

build/index.html: app/index.html
	@mkdir -p $(@D)
	@cp $^ $@
	@echo $@

build/snippeter-ui.js: app/snippeter-ui.js
	@mkdir -p $(@D)
	@uglifyjs $^ --output -m -c --output $@
	@echo $@

build/snippeter-ui.css: app/snippeter-ui.css
	@mkdir -p $(@D)
	@cleancss --output $@ $^
	@echo $@

