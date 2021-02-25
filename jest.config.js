module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: [ '<rootDir>/lib/**/*.spec.ts' ],
	collectCoverageFrom: [ '<rootDir>/lib/**' ],
	coveragePathIgnorePatterns: [ '/node_modules/', '/__snapshots__/', '/bin/' ],
	coverageReporters: [ 'lcov', 'text', 'html' ],
};
