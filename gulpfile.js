var _ = require("underscore");
var gulp = require("gulp");
var rollup = require("rollup");
var rename = require("gulp-rename");
var plumber = require('gulp-plumber');
var babel = require("rollup-plugin-babel");
var json = require('rollup-plugin-json');
var sourcemaps = require('gulp-sourcemaps');
var applySourceMap = require('vinyl-sourcemaps-apply');
var through = require('through2');
var gutil = require("gulp-util");
var del = require("del");
var resolve = require("resolve");
var path = require("path");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require("gulp-uglify");

gulp.task("clean", function() {
	return del([ "lib/", "dist/" ]);
});

function gulpRollup(options) {
	options = options || {};

	return through.obj(function(file, enc, done) {
		var pipe = this;

		if (!file.relative) { return; }

		if (file.isStream()) {
			return pipe.emit('error', new gutil.PluginError("rollup", 'Streaming not supported'));
		}

		rollup.rollup(_.extend({
			entry: file.path
		}, options)).then(function(bundle) {
			var res = bundle.generate(_.extend({
				sourceMap: Boolean(file.sourceMap)
			}, options));

			if (file.sourceMap && res.map) {
				res.map.file = file.path;
				applySourceMap(file, res.map);
			}

			file.contents = new Buffer(res.code);
			pipe.push(file);
		}).then(done).catch(function(err){
			var ge = new gutil.PluginError("rollup", err.message);
			pipe.emit('error', ge);
		});
	}, function() {
		this.emit('end');
	});
}

gulp.task("compile", function() {
	return gulp.src("src/index.js")
		.pipe(plumber({
			errorHandler: function(e) {
				console.error(e.toString());
			}
		}))
		.pipe(sourcemaps.init())
		.pipe(gulpRollup({
			format: "cjs",
			// external: externalDeps,
			useStrict: false,
			sourceMapFile: "lib/phonehome.js.map",
			plugins: [
				{ resolveId: function (id, rel) {
					if (!/^\.{0,2}\//.test(id)) return false;
					var p = resolve.sync(id, { basedir: path.dirname(rel) });
					return path.relative(__dirname, p);
				} },
				json(),
				babel({
					exclude: 'node_modules/**',
					sourceMap: true
				})
			]
		}))
		.pipe(rename({ basename: "phonehome" }))
		.pipe(sourcemaps.write({ sourceRoot: "./" }))
		.pipe(gulp.dest("lib"));
});

gulp.task("bundle", ["compile"], function() {
	var js = browserify("phonehome.js", {
		standalone: "PhoneHome",
		debug: true,
		basedir: __dirname + "/lib"
	});

	return js.bundle()
		.pipe(plumber({
			errorHandler: function(e) {
				console.error(e.toString());
			}
		}))
		.pipe(source("phonehome.js"))
		.pipe(buffer())
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sourcemaps.write(".", { sourceRoot: "./" }))
		.pipe(gulp.dest('dist/'));
});

gulp.task("minify-lib", ["compile"], function() {
	return gulp.src("lib/phonehome.js")
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(uglify())
		.pipe(rename({ suffix: ".min" }))
		.pipe(sourcemaps.write({ sourceRoot: "./" }))
		.pipe(gulp.dest('lib/'));
});

gulp.task("minify-bundle", ["bundle"], function() {
	return gulp.src("dist/phonehome.js")
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(uglify())
		.pipe(rename({ suffix: ".min" }))
		.pipe(sourcemaps.write(".", { sourceRoot: "./" }))
		.pipe(gulp.dest('dist/'));
});

gulp.task("minify", [ "minify-lib", "minify-bundle" ]);
gulp.task("dev", [ "bundle" ]);
gulp.task("dist", [ "minify" ]);
gulp.task("default", [ "dist" ]);
