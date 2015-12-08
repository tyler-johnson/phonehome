BIN = ./node_modules/.bin
SRC = $(wildcard src/*)

build: phonehome.js dist/phonehome.js dist/phonehome.min.js

define ROLLUP
require("rollup").rollup({
	entry: "$<",
	plugins: [
		require("rollup-plugin-babel")({
			exclude: 'node_modules/**'
		})
	]
}).then(function(bundle) {
	var result = bundle.generate({
		format: "cjs"
	});
	process.stdout.write(result.code);
}).catch(function(e) {
	process.nextTick(function() {
		throw e;
	});
});
endef

export ROLLUP

phonehome.js: src/index.js $(SRC)
	# $< -> $@
	@node -e "$$ROLLUP" > $@

dist/phonehome.js: phonehome.js
	# $< -> $@
	@mkdir -p dist
	@$(BIN)/browserify $< --debug --standalone PhoneHome > $@

dist/phonehome.min.js: dist/phonehome.js
	# $< -> $@
	@$(BIN)/uglifyjs $< > $@

# clean:
# 	rm -rf dist

.PHONY: build
