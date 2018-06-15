package envsubstituter

// This module imports a fairly simple string substitution functionality using
// environment variables.

// The key function is EnvironmentSubstitute(string) (string, error) This looks
// for "${BLAH}" strings and replaces them with environment variables. If
// environment variables are not defined, it returns an error.

import (
	"bytes"
	"fmt"
	"os"
)

func EnvironmentSubstitute(subject string) (string, error) {
	// This thing is extremely unoptimized but right now it doesn't really
	// need to be fast. We iterate through the string and look for "${",
	// then take everything until next "}".

	var result bytes.Buffer

	for i := 0; i < len(subject); i++ {
		if i < len(subject)-1 && subject[i] == '$' && subject[i+1] == '{' {
			var env_name bytes.Buffer
			j := i + 2
			for ; j < len(subject); j++ {
				if subject[j] == '}' {
					env_value, present := os.LookupEnv(env_name.String())
					if !present {
						return "", fmt.Errorf("Environment variable '%s' is not defined. Cannot perform substitution on '%s'", env_name, subject)
					}
					result.WriteString(env_value)
					break
				} else {
					env_name.WriteByte(subject[j])
				}
			}
			if j >= len(subject) {
				return "", fmt.Errorf("No matching } found in '%s'", subject)
			}
			i = j
			continue
		} else {
			result.WriteByte(subject[i])
		}
	}

	return result.String(), nil
}
