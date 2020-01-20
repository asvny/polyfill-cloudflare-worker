/* eslint-env mocha */
"use strict";

const assert = require('proclaim');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/sources', () => {
	let aliases;
	let fs;
	let sources;
	let process;
	let consoleMock;
	let pathMock;

	beforeEach(() => {

		fs = require('../mock/graceful-fs.mock');
		mockery.registerMock('graceful-fs', fs);
		fs.readdir.yields(undefined, []);

		process = require('../mock/process.mock');
		mockery.registerMock('process', process);

		consoleMock = require('../mock/console.mock');
		mockery.registerMock('console', consoleMock);

		pathMock = require('../mock/path.mock');
		mockery.registerMock('path', pathMock);

		aliases = {};
		mockery.registerMock('../polyfills/__dist/aliases.toml', aliases);
	});

	it('exports an object', () => {
		sources = require('../../../lib/sources');
		assert.isObject(sources);
	});

	it('has a getPolyfillMeta method', () => {
		const sources = require('../../../lib/sources');
		assert.isFunction(sources.getPolyfillMeta);
	});

	it('has a listPolyfills method', () => {
		const sources = require('../../../lib/sources');
		assert.isFunction(sources.listPolyfills);
	});

	it('has a listPolyfills method', () => {
		const sources = require('../../../lib/sources');
		assert.isFunction(sources.listPolyfills);
	});

	it('has a getConfigAliases method', () => {
		const sources = require('../../../lib/sources');
		assert.isFunction(sources.getConfigAliases);
	});

	it('has a streamPolyfillSource method', () => {
		const sources = require('../../../lib/sources');
		assert.isFunction(sources.streamPolyfillSource);
	});

	describe('sources.listPolyfills()', () => {
		it('filters out toml files from the polyfill directory', () => {
			const spy = sinon.spy(Array.prototype, 'filter');
			const sources = require('../../../lib/sources');

			return sources.listPolyfills().then(() => {
				spy.restore();
				assert.equal(spy.lastCall.args[0]('aliases.toml'), false);
				assert.equal(spy.lastCall.args[0]('example.toml'), false);
			});
		});

		it('returns a promise which resolves with an array containing names for each polyfilled feature', () => {
			fs.readdir.yields(undefined, ['Array.from', 'Symbol']);
			const sources = require('../../../lib/sources');
			return sources.listPolyfills().then(polyfills => assert.deepEqual(polyfills, ['Array.from', 'Symbol']));
		});
	});

	describe('sources.getConfigAliases()', () => {
		it('returns a promise which resolves with  an array of polyfills which are under the alias', () => {
			const TOML = require('@iarna/toml');
			const polyfills = ["Array.from", "Array.of", "Map", "Object.assign", "Object.is", "Promise", "Set", "Symbol", "WeakMap", "WeakSet"];
			fs.readFile.yields(undefined, TOML.stringify({
				es6: polyfills
			}));
			const sources = require('../../../lib/sources');
			return sources.getConfigAliases('es6').then(config => assert.deepEqual(config, polyfills));
		});

		it('returns a promise which resolves to undefined if alias does not exist', () => {
			const TOML = require('@iarna/toml');
			fs.readFile.yields(undefined, TOML.stringify({
				es6: ["Array.from", "Array.of", "Map", "Object.assign", "Object.is", "Promise", "Set", "Symbol", "WeakMap", "WeakSet"]
			}));
			const sources = require('../../../lib/sources');
			return sources.getConfigAliases('es7').then(config => assert.isUndefined(config));
		});
	});

	describe('sources.getPolyfillMeta()', () => {
		const metadata = {
			"aliases": ["es6"],
			"browsers": {
				"chrome": "<45"
			},
			"dependencies": ["Object.defineProperty"],
			"spec": "https://tc39.github.io/ecma262/#sec-array.from",
			"docs": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from"
		};

		beforeEach(() => {
			const TOML = require('@iarna/toml');
			fs.readdir.yields(undefined, ['Array.from']);
			fs.readFile.yields(undefined, TOML.stringify(metadata));
		});

		it('returns a promise which resolves with the metadata for a feature if it exists', () => {
			const sources = require('../../../lib/sources');
			return sources.getPolyfillMeta('Array.from').then(meta => assert.deepEqual(meta, metadata));
		});

		it('returns a promise which resolves with undefined for a feature if it does not exist', () => {
			fs.readFile.yields(new Error);
			const sources = require('../../../lib/sources');
			return sources.getPolyfillMeta('Array.of').then(meta => {
				assert.isUndefined(meta);
			});
		});
	});

	describe('sources.listPolyfills()', () => {
		it('returns a promise which resolves with  an array containing names for each polyfilled feature', () => {
			fs.readdir.yields(undefined, ['Array.from', 'Symbol']);
			const sources = require('../../../lib/sources');
			return sources.listPolyfills().then(polyfills => assert.deepEqual(polyfills, ['Array.from', 'Symbol']));
		});
	});

	describe('sources.streamPolyfillSource()', () => {
		it('returns a read-stream', () => {
			pathMock.join.resetHistory();
			pathMock.join.withArgs('../polyfills/__dist', 'Array.from', 'min.js').returns('../polyfills/__dist/Array.from/min.js');
			pathMock.join.returnsArg(1);

			fs.createReadStream.returns({ pipe: sinon.stub() });
			const sources = require('../../../lib/sources');
			sources.streamPolyfillSource('Array.from', 'min');
			assert.calledWithExactly(fs.createReadStream, '../polyfills/__dist/Array.from/min.js',
			{ encoding: 'UTF-8' });
		});
	});
});
