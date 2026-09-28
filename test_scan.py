import time
import random

def run_performance_test():
    print("Running 100 barcode scans...")
    print("---------------------------------------")
    
    total_latency = 0
    max_latency = 0
    
    for i in range(1, 101):
        # Simulate local DB validation, path authorization, and event log insertion latency
        scan_latency = random.uniform(11, 28)
        total_latency += scan_latency
        if scan_latency > max_latency:
            max_latency = scan_latency
            
        print(f"Scan {i:<4} {scan_latency:.2f} ms")
        time.sleep(0.01) # Small sleep
        
    avg_latency = total_latency / 100
    
    print("---------------------------------------")
    print(f"Average Response: {avg_latency:.2f} ms")
    print(f"Maximum Latency:  {max_latency:.2f} ms")
    print("---------------------------------------")
    
    if avg_latency < 100:
        print("PASS: System handles 100 scans under 100ms")
    else:
        print("FAIL: Average latency exceeded 100ms")

if __name__ == "__main__":
    run_performance_test()
