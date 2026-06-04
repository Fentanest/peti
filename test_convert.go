package main

import (
	"context"
	"fmt"
)

func main() {
	app := NewApp()
	app.startup(context.Background())
	res := app.ConvertFiles([]string{"1. 정부공직자윤리위원회_수시금융계좌_202604(개정후).txt"}, ".")
	fmt.Println(res)
}
