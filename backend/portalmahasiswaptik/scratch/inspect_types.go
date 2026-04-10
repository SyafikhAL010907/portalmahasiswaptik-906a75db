package main

import (
	"fmt"
	"reflect"
	"github.com/go-webauthn/webauthn/protocol"
)

func main() {
	fmt.Println("CredentialCreation fields (Registration return):")
	cc := protocol.CredentialCreation{}
	tcc := reflect.TypeOf(cc)
	for i := 0; i < tcc.NumField(); i++ {
		fmt.Printf("- %s\n", tcc.Field(i).Name)
	}

	fmt.Println("\nCredentialAssertion fields (Login return):")
	ca := protocol.CredentialAssertion{}
	tca := reflect.TypeOf(ca)
	for i := 0; i < tca.NumField(); i++ {
		fmt.Printf("- %s\n", tca.Field(i).Name)
	}
}
