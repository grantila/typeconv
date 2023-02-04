export default {
	resolver: "ts-jest-resolver",
	testEnvironment: 'node',
	testMatch: [ '<rootDir>/lib/**/*.spec.ts', '<rootDir>/lib/**/*.test.ts' ],
	collectCoverageFrom: [ '<rootDir>/lib/**' ],
	coveragePathIgnorePatterns: [ '/node_modules/', '/__snapshots__/', '/bin/' ],
	coverageReporters: [ 'lcov', 'text', 'html' ],
	extensionsToTreatAsEsm: [ ".ts" ],
};
