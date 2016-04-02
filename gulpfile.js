var gulp = require('gulp');
var ts = require('gulp-typescript');
var sass = require('gulp-sass');
var del = require('del');
var webpack = require('gulp-webpack');

gulp.task('clean', function() {
	del(['dist']);
	del(['build']);
});

gulp.task('copy', function() {
	gulp.src(
		[ 'src/**/*', '!src/browser/js/*', '!src/browser/css/*', '!src/**/*.ts' ],
		{ base: 'src' }
	).pipe(gulp.dest('dist'));
});

gulp.task('browser-ts', function() {
	return gulp.src(['src/browser/js/*.{ts,tsx}'])
		.pipe(ts({
			target: "ES5",
			module: "commonjs",
			experimentalDecorators: true
		}))
		.js
		.pipe(gulp.dest('build/browser/js'));
});

gulp.task('app-ts', function() {
	return gulp.src(['src/app/*.{ts,tsx}'])
		.pipe(ts({
			target: "ES5",
			module: "commonjs",
			experimentalDecorators: true
		}))
		.js
		.pipe(gulp.dest('dist/app'));
});

gulp.task('bundle', ['browser-ts'], function() {
	gulp.src('./build/browser/js/*.js')
		.pipe(webpack({
			entry: ['./build/browser/js/main.js'],
			output: {
				filename: 'bundle.js',
				library: 'app'
			},
			devtool: 'source-map',
			resolve: {
				extensions: ['', '.js']
			},
			target: "electron"
		}))
		.pipe(gulp.dest('dist/browser/js'));
});

gulp.task('scss', function() {
	gulp.src(['src/browser/css/*.scss'])
		.pipe(sass())
		.pipe(gulp.dest('dist/browser/css'));
});

gulp.task('watch', function() {
	gulp.watch(['src/**/*', '!src/browser/js/*', '!src/browser/css/*'], ['copy']);
	gulp.watch('src/browser/js/*.{ts,tsx}', ['bundle']);
	gulp.watch('src/browser/css/*.scss', ['scss']);
	gulp.watch('src/app/*.{ts,tsx}', ['app-ts']);
});

gulp.task('default', ['copy', 'bundle', 'scss', 'app-ts', 'watch']);
