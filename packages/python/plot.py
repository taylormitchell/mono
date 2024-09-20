def main():
    import json
    from collections import defaultdict
    from datetime import datetime
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates

    # Read data from file
    data = []
    with open('../../data/log.jsonl', 'r') as f:
        for line in f:
            entry = json.loads(line)
            data.append(entry)

    # Organize data into counts per date per type
    counts = defaultdict(lambda: defaultdict(int))  # counts[type][date] = count
    for entry in data:
        type_ = entry.get('type')
        datetime_str = entry.get('datetime')
        if datetime_str:
            # Parse the datetime string to a date object
            try:
                date_obj = datetime.fromisoformat(datetime_str).date()
            except ValueError:
                # If time is missing, append 'T00:00:00' to make it ISO format
                date_obj = datetime.fromisoformat(datetime_str + 'T00:00:00').date()
            counts[type_][date_obj] += 1

    # Prepare data for plotting
    all_dates = sorted({date for type_counts in counts.values() for date in type_counts.keys()})
    date_nums = mdates.date2num(all_dates)

    plt.figure(figsize=(12, 6))

    # Get all types
    all_types = list(counts.keys())
    num_types = len(all_types)

    # Determine the width of each bar
    bar_width = 0.8 / num_types  # Bar width as fraction of a day
    total_width = bar_width * num_types

    for i, type_ in enumerate(all_types):
        date_counts = counts[type_]
        counts_per_date = [date_counts.get(date, 0) for date in all_dates]

        # Compute positions
        positions = date_nums - total_width / 2 + i * bar_width

        plt.bar(positions, counts_per_date, width=bar_width, label=type_)

    # Set x-axis ticks to the dates
    plt.xticks(date_nums, [date.strftime('%Y-%m-%d') for date in all_dates], rotation=45)

    # Labeling and formatting
    plt.xlabel('Date')
    plt.ylabel('Count')
    plt.title('Counts per Type Over Time')
    plt.legend()
    plt.grid(True)

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main()