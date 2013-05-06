
test-watch:
	mocha tests/tests.js -u tdd -R spec -w -t 100

test:
	mocha tests/tests.js -u tdd -R spec -t 100


.PHONY: test test-watch
