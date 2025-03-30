if [ -t 0 ]; then
    echo "Terminal input: $1"
else
    echo "Piped input: $(cat)"
fi