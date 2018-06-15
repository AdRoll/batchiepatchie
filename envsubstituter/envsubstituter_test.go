package envsubstituter

import (
	"os"
	"testing"
)

func TestEnvironmentSubstitute(t *testing.T) {
	if str, _ := EnvironmentSubstitute("hello"); str != "hello" {
		t.Errorf("'hello' was not substituted to 'hello': '%s'", str)
	}

	if str, _ := EnvironmentSubstitute(""); str != "" {
		t.Errorf("Empty string was not substituted to another empty string")
	}

	if _, err := EnvironmentSubstitute("argblarg $(malfie) org"); err != nil {
		t.Errorf("Malformed substitution was not ignored as expected")
	}

	if _, err := EnvironmentSubstitute("argblarg ${hunter2kajsdmalfie} org"); err == nil {
		t.Errorf("Missing environment variable didn't throw an error")
	}

	os.Setenv("hunter2kajsdmalfie", "blah")
	unset := func() {
		os.Unsetenv("hunter2kajsdmalfie")
	}
	defer unset()

	if str, err := EnvironmentSubstitute("argblarg ${hunter2kajsdmalfie} org"); str != "argblarg blah org" {
		t.Errorf("Environment variable was not substituted correctly: '%s', %s", str, err)
	}

	if str, err := EnvironmentSubstitute("argblarg ${hunter2kajsdmalfie} ${hunter2kajsdmalfie} org"); str != "argblarg blah blah org" {
		t.Errorf("Environment variable was not substituted correctly: '%s', %s", str, err)
	}
}
